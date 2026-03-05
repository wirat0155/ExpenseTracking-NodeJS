const { getPool, sql } = require('../db');

// GET /api/dashboard/summary
exports.getDashboardSummary = async (req, res) => {
    try {
        const pool = await getPool();

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const userId = req.userId;

        const [totalResult, currentMonthResult, categoryResult, monthlyResult, latestResult, budgetResult] =
            await Promise.all([
                // Total expense overall for current user
                pool.request()
                    .input('userId', sql.UniqueIdentifier, userId)
                    .query(`
                        SELECT ISNULL(SUM(Amount), 0) AS totalExpense FROM Expenses WHERE UserId = @userId
                    `),

                // Current month total for current user
                pool.request()
                    .input('year', sql.Int, year)
                    .input('month', sql.Int, month)
                    .input('userId', sql.UniqueIdentifier, userId)
                    .query(`
                        SELECT ISNULL(SUM(Amount), 0) AS currentMonthTotal
                        FROM Expenses
                        WHERE YEAR(ExpenseDate) = @year AND MONTH(ExpenseDate) = @month AND UserId = @userId
                    `),

                // Expense by category for current user
                pool.request()
                    .input('userId', sql.UniqueIdentifier, userId)
                    .query(`
                        SELECT Category AS category, ISNULL(SUM(Amount), 0) AS total
                        FROM Expenses
                        WHERE UserId = @userId
                        GROUP BY Category
                        ORDER BY total DESC
                    `),

                // Monthly summary for current user
                pool.request()
                    .input('userId', sql.UniqueIdentifier, userId)
                    .query(`
                        SELECT
                            YEAR(ExpenseDate)  AS year,
                            MONTH(ExpenseDate) AS month,
                            ISNULL(SUM(Amount), 0) AS total,
                            COUNT(*) AS count
                        FROM Expenses
                        WHERE UserId = @userId
                        GROUP BY YEAR(ExpenseDate), MONTH(ExpenseDate)
                        ORDER BY year DESC, month DESC
                    `),

                // Latest 5 expenses for current user
                pool.request()
                    .input('userId', sql.UniqueIdentifier, userId)
                    .query(`
                        SELECT TOP 5 Id, Title, Amount, Category, ExpenseDate
                        FROM Expenses
                        WHERE UserId = @userId
                        ORDER BY ExpenseDate DESC, Id DESC
                    `),

                // Current month budget for current user (with fallback to master)
                pool.request()
                    .input('year', sql.Int, year)
                    .input('month', sql.Int, month)
                    .input('userId', sql.UniqueIdentifier, userId)
                    .query(`
                        SELECT TOP 1 Amount FROM Budgets WHERE [Year] = @year AND [Month] = @month AND UserId = @userId
                        UNION ALL
                        SELECT CAST([Value] AS DECIMAL(18,2)) FROM Settings WHERE [Key] = 'MasterBudget' AND UserId = @userId
                    `)
            ]);

        // budgetResult.recordset[0] will be monthly if exists, else first element is master
        const currentMonthBudget = budgetResult.recordset[0] ? budgetResult.recordset[0].Amount : 5000;

        res.json({
            totalExpense: totalResult.recordset[0].totalExpense,
            currentMonthTotal: currentMonthResult.recordset[0].currentMonthTotal,
            currentMonthBudget: currentMonthBudget,
            categorySummary: categoryResult.recordset,
            monthlySummary: monthlyResult.recordset,
            latestExpenses: latestResult.recordset
        });
    } catch (err) {
        console.error('getDashboardSummary error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard summary' });
    }
};
