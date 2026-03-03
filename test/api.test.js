const test = require('node:test');
const assert = require('node:assert');

const BASE_URL = 'http://localhost:3000/api/expenses';

test('Backend API - Expense Tracker', async (t) => {

    let tempExpenseId;
    let tempGroupId;

    await t.test('1. POST /api/expenses - Create Single Expense', async () => {
        const res = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Automated Test Expense',
                amount: 150.75,
                category: 'อาหารและเครื่องดื่ม',
                expenseDate: new Date().toISOString().slice(0, 10)
            })
        });

        assert.strictEqual(res.status, 201, 'Should return 201 Created');
        const data = await res.json();
        assert.ok(data.Id, 'Should have an Id');
        assert.strictEqual(data.Title, 'Automated Test Expense');
        assert.strictEqual(data.Amount, 150.75);
        tempExpenseId = data.Id;
    });

    await t.test('2. GET /api/expenses - List Expenses', async () => {
        const res = await fetch(BASE_URL);
        assert.strictEqual(res.status, 200);
        const resData = await res.json();
        assert.ok(Array.isArray(resData.data), 'Result data should be an array');
        const found = resData.data.find(e => e.Id === tempExpenseId);
        assert.ok(found, 'Created expense should be in the list');
    });

    await t.test('3. POST /api/expenses - Create Split Expense', async () => {
        const res = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Split Test',
                amount: 1200,
                category: 'การเดินทาง',
                expenseDate: '2026-03-01',
                splitMonths: 3
            })
        });

        assert.strictEqual(res.status, 201);
        const data = await res.json();
        assert.strictEqual(data.length, 3, 'Should create 3 items');
        assert.ok(data[0].GroupId, 'Should have a GroupId');
        tempGroupId = data[0].GroupId;
        assert.strictEqual(data[0].Amount, 400, 'Split amount should be correct');
    });

    await t.test('4. DELETE /api/expenses/:id - Cascading Delete Group', async () => {
        // Fetch to find one id from the group
        const listRes = await fetch(BASE_URL);
        const resData = await listRes.json();
        const groupItem = resData.data.find(e => e.GroupId === tempGroupId);

        const delRes = await fetch(`${BASE_URL}/${groupItem.Id}`, { method: 'DELETE' });
        assert.strictEqual(delRes.status, 200, 'Delete should succeed');

        // Check if all items in group are gone
        const afterListRes = await fetch(BASE_URL);
        const afterResData = await afterListRes.json();
        const stillExists = afterResData.data.some(e => e.GroupId === tempGroupId);
        assert.strictEqual(stillExists, false, 'Full group should be deleted');
    });

    await t.test('5. DELETE /api/expenses/:id - Clean up single test item', async () => {
        const delRes = await fetch(`${BASE_URL}/${tempExpenseId}`, { method: 'DELETE' });
        assert.strictEqual(delRes.status, 200);
    });
});
