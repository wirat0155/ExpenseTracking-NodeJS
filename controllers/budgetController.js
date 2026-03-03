const { getPool, sql } = require('../db');

// GET /api/budgets?year=YYYY&month=MM — get budget for a month
exports.getBudget = async (req, res) => {
    try {
        const pool = await getPool();
        const year = parseInt(req.query.year || new Date().getFullYear(), 10);
        const month = parseInt(req.query.month || (new Date().getMonth() + 1), 10);

        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            return res.status(400).json({ error: 'Invalid year or month' });
        }

        // 1. Check if a specific budget exists for this month
        let result = await pool.request()
            .input('year', sql.Int, year)
            .input('month', sql.Int, month)
            .query('SELECT Amount FROM Budgets WHERE [Year] = @year AND [Month] = @month');

        if (result.recordset.length > 0) {
            return res.json({ amount: result.recordset[0].Amount, isCustom: true });
        }

        // 2. Otherwise, get the Master Budget from Settings
        result = await pool.request()
            .query("SELECT [Value] FROM Settings WHERE [Key] = 'MasterBudget'");

        const masterBudget = result.recordset.length > 0 ? parseFloat(result.recordset[0].Value) : 5000;
        res.json({ amount: masterBudget, isCustom: false });
    } catch (err) {
        console.error('getBudget error:', err);
        res.status(500).json({ error: 'Failed to fetch budget' });
    }
};

// GET /api/budgets/master — get the master default budget
exports.getMasterBudget = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query("SELECT [Value] FROM Settings WHERE [Key] = 'MasterBudget'");

        const masterBudget = result.recordset.length > 0 ? parseFloat(result.recordset[0].Value) : 5000;
        res.json({ amount: masterBudget });
    } catch (err) {
        console.error('getMasterBudget error:', err);
        res.status(500).json({ error: 'Failed to fetch master budget' });
    }
};

// POST /api/budgets — Set budget for a specific month
exports.setBudget = async (req, res) => {
    const { year, month, amount } = req.body;
    let transaction;

    try {
        if (!year || !month || amount === undefined) {
            return res.status(400).json({ error: 'Year, Month, and Amount are required' });
        }

        const pool = await getPool();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);

        // 1. Check if it exists
        const checkResult = await request
            .input('year', sql.Int, year)
            .input('month', sql.Int, month)
            .query('SELECT Id FROM Budgets WHERE [Year] = @year AND [Month] = @month');

        if (checkResult.recordset.length > 0) {
            // Update
            await new sql.Request(transaction)
                .input('year', sql.Int, year)
                .input('month', sql.Int, month)
                .input('amount', sql.Decimal(18, 2), amount)
                .query('UPDATE Budgets SET Amount = @amount, UpdatedAt = GETDATE() WHERE [Year] = @year AND [Month] = @month');
        } else {
            // Insert
            await new sql.Request(transaction)
                .input('year', sql.Int, year)
                .input('month', sql.Int, month)
                .input('amount', sql.Decimal(18, 2), amount)
                .query('INSERT INTO Budgets ([Year], [Month], Amount) VALUES (@year, @month, @amount)');
        }

        await transaction.commit();
        res.json({ message: 'Budget updated successfully' });
    } catch (err) {
        if (transaction) {
            try { await transaction.rollback(); } catch (e) { console.warn('Rollback failed:', e.message); }
        }
        console.error('setBudget error:', err);
        res.status(500).json({ error: 'Failed to set budget' });
    }
};

// POST /api/budgets/master — Update the Master Default Budget
exports.updateMasterBudget = async (req, res) => {
    const { amount } = req.body;
    let transaction;

    try {
        if (amount === undefined) {
            return res.status(400).json({ error: 'Amount is required' });
        }

        const pool = await getPool();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);
        await request
            .input('amount', sql.NVarChar, amount.toString())
            .query("UPDATE Settings SET [Value] = @amount, UpdatedAt = GETDATE() WHERE [Key] = 'MasterBudget'");

        await transaction.commit();
        res.json({ message: 'Master budget updated successfully' });
    } catch (err) {
        if (transaction) {
            try { await transaction.rollback(); } catch (e) { console.warn('Rollback failed:', e.message); }
        }
        console.error('updateMasterBudget error:', err);
        res.status(500).json({ error: 'Failed to update master budget' });
    }
};

// GET /api/budgets/logs — fetch audit logs
exports.getBudgetLogs = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query('SELECT TOP 100 * FROM BudgetAuditLog ORDER BY ChangedAt DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error('getBudgetLogs error:', err);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
};

