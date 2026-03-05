const { getPool, sql } = require('../db');
const crypto = require('crypto');

// GET /api/expenses — list all (with Server-Side Processing: Search, Pagination, Sort, Filter)
exports.getExpenses = async (req, res) => {
    try {
        const pool = await getPool();
        const {
            startDate, endDate,
            minAmount, maxAmount,
            categories, // Comma-separated string
            search,
            page = 1, limit = 10,
            sortBy = 'ExpenseDate', sortDir = 'DESC'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const rowsLimit = parseInt(limit);

        // Build base WHERE clause — always filter by current user
        let whereClauses = ['UserId = @userId'];
        const request = pool.request();
        request.input('userId', sql.UniqueIdentifier, req.userId);

        if (startDate) {
            whereClauses.push('ExpenseDate >= @startDate');
            request.input('startDate', sql.Date, startDate);
        }
        if (endDate) {
            whereClauses.push('ExpenseDate <= @endDate');
            request.input('endDate', sql.Date, endDate);
        }

        if (minAmount !== undefined && minAmount !== '') {
            whereClauses.push('Amount >= @minAmount');
            request.input('minAmount', sql.Decimal(18, 2), minAmount);
        }
        if (maxAmount !== undefined && maxAmount !== '') {
            whereClauses.push('Amount <= @maxAmount');
            request.input('maxAmount', sql.Decimal(18, 2), maxAmount);
        }

        if (categories && categories.length > 0) {
            const catArray = categories.split(',').filter(c => c.trim() !== '');
            if (catArray.length > 0) {
                const catClauses = [];
                catArray.forEach((cat, i) => {
                    const paramName = `cat_${i}`;
                    catClauses.push(`@${paramName}`);
                    request.input(paramName, sql.NVarChar, cat);
                });
                whereClauses.push(`Category IN (${catClauses.join(',')})`);
            }
        }

        if (search) {
            whereClauses.push('Title LIKE @search');
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        const whereStr = `WHERE ${whereClauses.join(' AND ')}`;

        // Validate Sort Columns to prevent SQL Injection
        const validSortCols = ['Title', 'Amount', 'Category', 'ExpenseDate', 'CreatedAt'];
        const finalSortCol = validSortCols.includes(sortBy) ? sortBy : 'ExpenseDate';
        const finalSortDir = sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Query Total Count
        const countQuery = `SELECT COUNT(*) as total FROM Expenses ${whereStr}`;
        const countResult = await request.query(countQuery);
        const totalCount = countResult.recordset[0].total;

        // Query Data with Pagination
        const dataQuery = `
            SELECT * FROM Expenses 
            ${whereStr} 
            ORDER BY ${finalSortCol} ${finalSortDir}, Id DESC
            OFFSET @offset ROWS FETCH NEXT @rowsLimit ROWS ONLY
        `;
        request.input('offset', sql.Int, offset);
        request.input('rowsLimit', sql.Int, rowsLimit);

        const dataResult = await request.query(dataQuery);

        res.json({
            data: dataResult.recordset,
            totalCount,
            totalPages: Math.ceil(totalCount / rowsLimit),
            currentPage: parseInt(page),
            limit: rowsLimit
        });
    } catch (err) {
        console.error('getExpenses error:', err);
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
};

// POST /api/expenses — create new expense (Handles single and split/distributed expenses)
exports.createExpense = async (req, res) => {
    const { title, amount, category, expenseDate, splitMonths } = req.body;
    let transaction;

    try {
        if (!title || !amount || !category || !expenseDate) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const numAmount = Number(amount);
        if (numAmount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }

        const pool = await getPool();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const results = [];

        // Handle Distributed Expense (Split Months)
        if (splitMonths && splitMonths > 1) {
            const months = parseInt(splitMonths, 10);
            const splitAmount = numAmount / months;
            const groupId = crypto.randomUUID();
            const baseDate = new Date(expenseDate);
            const baseDay = baseDate.getDate();

            for (let i = 1; i <= months; i++) {
                const targetMonth = baseDate.getMonth() + (i - 1);
                const date = new Date(baseDate.getFullYear(), targetMonth, 1);
                const lastDayInMonth = new Date(baseDate.getFullYear(), targetMonth + 1, 0).getDate();
                date.setDate(Math.min(baseDay, lastDayInMonth));

                const formattedDate = date.toISOString().slice(0, 10);
                const fullTitle = `${title} งวดที่ ${i}/${months}`;

                const innerReq = new sql.Request(transaction);
                const result = await innerReq
                    .input('title', sql.NVarChar(255), fullTitle)
                    .input('amount', sql.Decimal(18, 2), splitAmount)
                    .input('category', sql.NVarChar(100), category)
                    .input('expenseDate', sql.Date, formattedDate)
                    .input('groupId', sql.UniqueIdentifier, groupId)
                    .input('userId', sql.UniqueIdentifier, req.userId)
                    .query(`INSERT INTO Expenses (Title, Amount, Category, ExpenseDate, GroupId, UserId)
                            OUTPUT INSERTED.*
                            VALUES (@title, @amount, @category, @expenseDate, @groupId, @userId)`);
                results.push(result.recordset[0]);
            }
            await transaction.commit();
            return res.status(201).json(results);
        } else {
            // Normal Single Expense
            const request = new sql.Request(transaction);
            const result = await request
                .input('title', sql.NVarChar(255), title)
                .input('amount', sql.Decimal(18, 2), numAmount)
                .input('category', sql.NVarChar(100), category)
                .input('expenseDate', sql.Date, expenseDate)
                .input('userId', sql.UniqueIdentifier, req.userId)
                .query(`INSERT INTO Expenses (Title, Amount, Category, ExpenseDate, UserId)
                        OUTPUT INSERTED.*
                        VALUES (@title, @amount, @category, @expenseDate, @userId)`);

            await transaction.commit();
            return res.status(201).json(result.recordset[0]);
        }
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('createExpense error:', err);
        res.status(500).json({ error: 'Failed to create expense' });
    }
};

// DELETE /api/expenses/:id — delete expense (Handles group deletion with Transaction)
exports.deleteExpense = async (req, res) => {
    const { id } = req.params;
    let transaction;

    try {
        const pool = await getPool();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);

        // 1. Check if this expense belongs to the current user
        const checkResult = await request
            .input('id', sql.UniqueIdentifier, id)
            .input('userId', sql.UniqueIdentifier, req.userId)
            .query('SELECT GroupId FROM Expenses WHERE Id = @id AND UserId = @userId');

        if (checkResult.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Expense not found' });
        }

        const groupId = checkResult.recordset[0].GroupId;

        if (groupId) {
            // 2. Delete the whole group (only for this user)
            const deleteReq = new sql.Request(transaction);
            await deleteReq
                .input('groupId', sql.UniqueIdentifier, groupId)
                .input('userId', sql.UniqueIdentifier, req.userId)
                .query('DELETE FROM Expenses WHERE GroupId = @groupId AND UserId = @userId');
        } else {
            // 3. Just delete the single expense
            const deleteReq = new sql.Request(transaction);
            await deleteReq
                .input('id', sql.UniqueIdentifier, id)
                .input('userId', sql.UniqueIdentifier, req.userId)
                .query('DELETE FROM Expenses WHERE Id = @id AND UserId = @userId');
        }

        await transaction.commit();
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('deleteExpense error:', err);
        res.status(500).json({ error: 'Failed to delete expense' });
    }
};

// GET /api/expenses/calendar?year=YYYY&month=MM
exports.getCalendar = async (req, res) => {
    try {
        const pool = await getPool();
        const year = parseInt(req.query.year || new Date().getFullYear(), 10);
        const month = parseInt(req.query.month || (new Date().getMonth() + 1), 10);

        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            return res.status(400).json({ error: 'Invalid year or month' });
        }

        // Fetch all expenses for the given month for the current user
        const result = await pool.request()
            .input('year', sql.Int, year)
            .input('month', sql.Int, month)
            .input('userId', sql.UniqueIdentifier, req.userId)
            .query(`
                SELECT Id, Title, Amount, Category, ExpenseDate
                FROM Expenses
                WHERE YEAR(ExpenseDate) = @year AND MONTH(ExpenseDate) = @month AND UserId = @userId
                ORDER BY ExpenseDate ASC, Id ASC
            `);

        // Group by date
        const map = {};
        for (const row of result.recordset) {
            const dateKey = new Date(row.ExpenseDate).toISOString().slice(0, 10);
            if (!map[dateKey]) {
                map[dateKey] = { date: dateKey, total: 0, items: [] };
            }
            map[dateKey].total += parseFloat(row.Amount);
            map[dateKey].items.push({
                id: row.Id,
                title: row.Title,
                amount: parseFloat(row.Amount),
                category: row.Category
            });
        }

        res.json(Object.values(map));
    } catch (err) {
        console.error('getCalendar error:', err);
        res.status(500).json({ error: 'Failed to fetch calendar data' });
    }
};

// GET /api/expenses/summary — total summary for current user
exports.getSummary = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('userId', sql.UniqueIdentifier, req.userId)
            .query(`SELECT 
                        COUNT(*) AS totalCount,
                        ISNULL(SUM(Amount), 0) AS totalAmount
                    FROM Expenses
                    WHERE UserId = @userId`);

        res.json(result.recordset[0]);
    } catch (err) {
        console.error('getSummary error:', err);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
};
