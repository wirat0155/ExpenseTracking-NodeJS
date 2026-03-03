const test = require('node:test');
const assert = require('node:assert');

const BASE_URL = 'http://localhost:3000/api/expenses';

test('Backend API - Advanced DataTable Filtering', async (t) => {

    await t.test('1. SSR - Search by Title', async () => {
        const query = new URLSearchParams({ search: 'Automated' });
        const res = await fetch(`${BASE_URL}?${query.toString()}`);
        const data = await res.json();
        assert.ok(Array.isArray(data.data));
        // Should contain items with "Automated" in Title
        data.data.forEach(item => {
            assert.ok(item.Title.includes('Automated') || item.Title.includes('Test'), `Item ${item.Title} should match search`);
        });
    });

    await t.test('2. SSR - Amount Range Filtering', async () => {
        const query = new URLSearchParams({ minAmount: 100, maxAmount: 500 });
        const res = await fetch(`${BASE_URL}?${query.toString()}`);
        const data = await res.json();
        data.data.forEach(item => {
            assert.ok(item.Amount >= 100 && item.Amount <= 500, `Amount ${item.Amount} out of range [100, 500]`);
        });
    });

    await t.test('3. SSR - Multiple Categories Filtering', async () => {
        const cats = 'อาหารและเครื่องดื่ม,การเดินทาง';
        const query = new URLSearchParams({ categories: cats });
        const res = await fetch(`${BASE_URL}?${query.toString()}`);
        const data = await res.json();
        const allowed = cats.split(',');
        data.data.forEach(item => {
            assert.ok(allowed.includes(item.Category), `Category ${item.Category} not in ${cats}`);
        });
    });

    await t.test('4. SSR - Date Range Filtering', async () => {
        const start = '2020-01-01';
        const end = '2030-12-31';
        const query = new URLSearchParams({ startDate: start, endDate: end });
        const res = await fetch(`${BASE_URL}?${query.toString()}`);
        const data = await res.json();
        data.data.forEach(item => {
            const date = item.ExpenseDate.split('T')[0];
            assert.ok(date >= start && date <= end, `Date ${date} out of range [${start}, ${end}]`);
        });
    });

    await t.test('5. SSR - Sorting & Pagination', async () => {
        const query = new URLSearchParams({
            sortBy: 'Amount',
            sortDir: 'ASC',
            page: 1,
            limit: 5
        });
        const res = await fetch(`${BASE_URL}?${query.toString()}`);
        const data = await res.json();

        assert.strictEqual(data.data.length <= 5, true, 'Should respect limit');

        if (data.data.length > 1) {
            for (let i = 0; i < data.data.length - 1; i++) {
                assert.ok(data.data[i].Amount <= data.data[i + 1].Amount, 'Should be sorted by Amount ASC');
            }
        }
    });
});
