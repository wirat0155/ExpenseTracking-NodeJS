const { getPool, sql } = require('../db');

// GET /api/dashboard/summary
exports.getDashboardSummary = async (req, res) => {
    try {
        const pool = await getPool();

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const [totalResult, currentMonthResult, categoryResult, monthlyResult, latestResult, budgetResult] =
            await Promise.all([
                // Total expense overall
                pool.request().query(`
                    SELECT ISNULL(SUM(Amount), 0) AS totalExpense FROM Expenses
                `),

                // Current month total
                pool.request()
                    .input('year', sql.Int, year)
                    .input('month', sql.Int, month)
                    .query(`
                        SELECT ISNULL(SUM(Amount), 0) AS currentMonthTotal
                        FROM Expenses
                        WHERE YEAR(ExpenseDate) = @year AND MONTH(ExpenseDate) = @month
                    `),

                // Expense by category
                pool.request().query(`
                    SELECT Category AS category, ISNULL(SUM(Amount), 0) AS total
                    FROM Expenses
                    GROUP BY Category
                    ORDER BY total DESC
                `),

                // Monthly summary
                pool.request().query(`
                    SELECT
                        YEAR(ExpenseDate)  AS year,
                        MONTH(ExpenseDate) AS month,
                        ISNULL(SUM(Amount), 0) AS total,
                        COUNT(*) AS count
                    FROM Expenses
                    GROUP BY YEAR(ExpenseDate), MONTH(ExpenseDate)
                    ORDER BY year DESC, month DESC
                `),

                // Latest 5 expenses
                pool.request().query(`
                    SELECT TOP 5 Id, Title, Amount, Category, ExpenseDate
                    FROM Expenses
                    ORDER BY ExpenseDate DESC, Id DESC
                `),

                // Current month budget (with fallback to master)
                pool.request()
                    .input('year', sql.Int, year)
                    .input('month', sql.Int, month)
                    .query(`
                        SELECT TOP 1 Amount FROM Budgets WHERE [Year] = @year AND [Month] = @month
                        UNION ALL
                        SELECT CAST([Value] AS DECIMAL(18,2)) FROM Settings WHERE [Key] = 'MasterBudget'
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
