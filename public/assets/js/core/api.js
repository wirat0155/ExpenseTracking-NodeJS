/**
 * api.js — Centralized API calls
 */

window.API = {
    expenses: '/api/expenses',
    dashboard: '/api/dashboard/summary',

    // GET all or filtered expenses (SSR)
    getExpenses: async (options = {}) => {
        const {
            startDate, endDate,
            minAmount, maxAmount, categories,
            search, page = 1, limit = 10,
            sortBy = 'ExpenseDate', sortDir = 'DESC'
        } = options;

        let params = new URLSearchParams({ page, limit, sortBy, sortDir });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (minAmount !== undefined && minAmount !== '') params.append('minAmount', minAmount);
        if (maxAmount !== undefined && maxAmount !== '') params.append('maxAmount', maxAmount);
        if (categories && categories.length > 0) {
            params.append('categories', Array.isArray(categories) ? categories.join(',') : categories);
        }
        if (search) params.append('search', search);

        const res = await fetch(`${window.API.expenses}?${params.toString()}`);
        if (!res.ok) throw new Error('Fetch failed');
        return await res.json();
    },

    // GET summary for index
    getSummary: async () => {
        const res = await fetch(`${window.API.expenses}/summary`);
        if (!res.ok) throw new Error('Fetch failed');
        return await res.json();
    },

    // POST new expense
    addExpense: async (data) => {
        const res = await fetch(window.API.expenses, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Create failed');
        }
        return await res.json();
    },

    // DELETE expense
    deleteExpense: async (id) => {
        const res = await fetch(`${window.API.expenses}/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        return true;
    },

    // GET dashboard summary
    getDashboardSummary: async () => {
        const res = await fetch(window.API.dashboard);
        if (!res.ok) throw new Error('Failed to load dashboard');
        return await res.json();
    },

    // GET calendar data
    getCalendarData: async (year, month) => {
        const res = await fetch(`${window.API.expenses}/calendar?year=${year}&month=${month}`);
        if (!res.ok) throw new Error('Load failed');
        return await res.json();
    },

    // --- Budget API ---
    getBudget: async (year, month) => {
        const res = await fetch(`/api/budgets?year=${year}&month=${month}`);
        if (!res.ok) throw new Error('Failed to fetch budget');
        return await res.json();
    },

    getMasterBudget: async () => {
        const res = await fetch('/api/budgets/master');
        if (!res.ok) throw new Error('Failed to fetch master budget');
        return await res.json();
    },

    setBudget: async (year, month, amount) => {
        const res = await fetch('/api/budgets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ year, month, amount })
        });
        if (!res.ok) throw new Error('Update budget failed');
        return await res.json();
    },

    updateMasterBudget: async (amount) => {
        const res = await fetch('/api/budgets/master', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
        });
        if (!res.ok) throw new Error('Update master budget failed');
        return await res.json();
    }
};
