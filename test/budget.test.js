const test = require('node:test');
const assert = require('node:assert');
require('dotenv').config();

const BUDGET_URL = 'http://localhost:3000/api/budgets';
const DASHBOARD_URL = 'http://localhost:3000/api/dashboard/summary';

test('Budget API - Feature Tests', async (t) => {

    let originalMasterBudget;

    // Pre-test cleanup: Clear budgets and logs for the test period
    const { getPool, sql: mssql } = require('../db');
    const pool = await getPool();
    await pool.request().input('y', mssql.Int, 2099).input('m', mssql.Int, 12).query('DELETE FROM Budgets WHERE [Year] = @y AND [Month] = @m');
    await pool.request().input('y', mssql.Int, 2099).input('m', mssql.Int, 12).query('DELETE FROM BudgetAuditLog WHERE [Year] = @y AND [Month] = @m OR NewAmount = 7500');


    await t.test('1. GET /api/budgets/master - Fetch Default Master Budget', async () => {
        const res = await fetch(`${BUDGET_URL}/master`);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.ok(typeof data.amount === 'number', 'Master budget should be a number');
        originalMasterBudget = data.amount;
    });

    await t.test('2. POST /api/budgets/master - Update Master Budget', async () => {
        const newBudget = 7500;
        const res = await fetch(`${BUDGET_URL}/master`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: newBudget })
        });
        assert.strictEqual(res.status, 200);

        // Verify update
        const verifyRes = await fetch(`${BUDGET_URL}/master`);
        const verifyData = await verifyRes.json();
        assert.strictEqual(verifyData.amount, newBudget, 'Master budget should be updated to 7500');
    });

    await t.test('3. GET /api/budgets - Fetch Monthly Budget (Fallback to Master)', async () => {
        // Use a far future date to ensure no custom budget exists
        const year = 2099;
        const month = 12;
        const res = await fetch(`${BUDGET_URL}?year=${year}&month=${month}`);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.amount, 7500, 'Should return master budget when no custom override exists');
        assert.strictEqual(data.isCustom, false, 'isCustom should be false');
    });

    await t.test('4. POST /api/budgets - Set Custom Monthly Budget', async () => {
        const year = 2099;
        const month = 12;
        const customAmount = 12000;
        const res = await fetch(BUDGET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ year, month, amount: customAmount })
        });
        assert.strictEqual(res.status, 200);

        // Verify update
        const verifyRes = await fetch(`${BUDGET_URL}?year=${year}&month=${month}`);
        const verifyData = await verifyRes.json();
        assert.strictEqual(verifyData.amount, customAmount, 'Monthly budget should be updated to 12000');
        assert.strictEqual(verifyData.isCustom, true, 'isCustom should be true');
    });

    await t.test('5. GET /api/dashboard/summary - Include Budget Data', async () => {
        const res = await fetch(DASHBOARD_URL);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.ok(data.hasOwnProperty('currentMonthBudget'), 'Dashboard should include budget info');
        assert.ok(typeof data.currentMonthBudget === 'number');
    });

    await t.test('6. GET /api/budgets/logs - Verify Audit Entry', async () => {
        const res = await fetch(`${BUDGET_URL}/logs`);
        assert.strictEqual(res.status, 200);
        const data = await res.json();

        // Find the log for MasterBudget update
        const masterLog = data.find(log => log.SettingKey === 'MasterBudget' && log.Action === 'UPDATE');
        assert.ok(masterLog, 'Audit log should contain MasterBudget update');
    });

    await t.test('7. GET /api/budgets/logs - Verify Custom Budget Audit Logic', async () => {
        const res = await fetch(`${BUDGET_URL}/logs`);
        const data = await res.json();

        // Find log for Custom Budget INSERT (from test #4)
        const customLog = data.find(log => log.Year === 2099 && log.Month === 12 && log.Action === 'INSERT');
        assert.ok(customLog, 'Audit log should contain Custom monthly budget insert');
    });


    // Cleanup: Restore master budget and delete test custom budget
    await t.test('8. Cleanup - Restore Master Budget and Data', async () => {
        // Restore Master
        await fetch(`${BUDGET_URL}/master`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: originalMasterBudget })
        });

        // Delete test logs and data
        await pool.request()
            .input('year', mssql.Int, 2099)
            .input('month', mssql.Int, 12)
            .query('DELETE FROM BudgetAuditLog WHERE ([Year] = @year AND [Month] = @month) OR NewAmount = 7500');

        await pool.request()
            .input('year', mssql.Int, 2099)
            .input('month', mssql.Int, 12)
            .query('DELETE FROM Budgets WHERE [Year] = @year AND [Month] = @month');
    });
});


