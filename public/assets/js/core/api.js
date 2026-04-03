/**
 * api.js — Centralized API calls with JWT Authentication
 */

window.API = {
    expenses: '/api/expenses',
    dashboard: '/api/dashboard/summary',

    /**
     * Get the stored JWT token from localStorage
     */
    getToken() {
        return localStorage.getItem('auth_token');
    },

    /**
     * Build Authorization header object
     */
    authHeaders() {
        const token = this.getToken();
        return token ? { 'Authorization': 'Bearer ' + token } : {};
    },

    /**
     * Handle 401 Unauthorized — redirect to login (use replace to prevent back button)
     */
    handleUnauthorized() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.replace('/expense/login.html');
    },

    /**
     * Authenticated fetch wrapper
     */
    async authFetch(url, options = {}) {
        const headers = {
            ...this.authHeaders(),
            ...(options.headers || {})
        };
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) {
            this.handleUnauthorized();
            throw new Error('Unauthorized');
        }
        return res;
    },

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

        const res = await window.API.authFetch(`${window.API.expenses}?${params.toString()}`);
        if (!res.ok) throw new Error('Fetch failed');
        return await res.json();
    },

    // GET summary for index
    getSummary: async () => {
        const res = await window.API.authFetch(`${window.API.expenses}/summary`);
        if (!res.ok) throw new Error('Fetch failed');
        return await res.json();
    },

    // GET expense suggestions
    getExpenseSuggestions: async (q) => {
        const res = await window.API.authFetch(`${window.API.expenses}/suggestions?q=${encodeURIComponent(q)}`);
        if (!res.ok) return [];
        return await res.json();
    },

    // POST new expense
    addExpense: async (data) => {
        const res = await window.API.authFetch(window.API.expenses, {
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
        const res = await window.API.authFetch(`${window.API.expenses}/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        return true;
    },

    // GET dashboard summary
    getDashboardSummary: async () => {
        const res = await window.API.authFetch(window.API.dashboard);
        if (!res.ok) throw new Error('Failed to load dashboard');
        return await res.json();
    },

    // GET calendar data
    getCalendarData: async (year, month) => {
        const res = await window.API.authFetch(`${window.API.expenses}/calendar?year=${year}&month=${month}`);
        if (!res.ok) throw new Error('Load failed');
        return await res.json();
    },

    // --- Budget API ---
    getBudget: async (year, month) => {
        const res = await window.API.authFetch(`/api/budgets?year=${year}&month=${month}`);
        if (!res.ok) throw new Error('Failed to fetch budget');
        return await res.json();
    },

    getMasterBudget: async () => {
        const res = await window.API.authFetch('/api/budgets/master');
        if (!res.ok) throw new Error('Failed to fetch master budget');
        return await res.json();
    },

    setBudget: async (year, month, amount) => {
        const res = await window.API.authFetch('/api/budgets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ year, month, amount })
        });
        if (!res.ok) throw new Error('Update budget failed');
        return await res.json();
    },

    updateMasterBudget: async (amount) => {
        const res = await window.API.authFetch('/api/budgets/master', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
        });
        if (!res.ok) throw new Error('Update master budget failed');
        return await res.json();
    },

    // --- Category API ---
    getCategories: async () => {
        const res = await window.API.authFetch('/api/categories');
        if (!res.ok) throw new Error('Failed to fetch categories');
        return await res.json();
    },

    createCategory: async (name) => {
        const res = await window.API.authFetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create category');
        }
        return await res.json();
    },

    deleteCategory: async (id) => {
        const res = await window.API.authFetch(`/api/categories/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete category');
        }
        return true;
    },

    // --- Auth API ---
    login: async (email, password) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Login failed');
        }
        return await res.json();
    },

    getMe: async () => {
        const res = await window.API.authFetch('/api/auth/me');
        if (!res.ok) throw new Error('Failed to fetch user info');
        return await res.json();
    },

    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        // Use replace to prevent back button access to previous pages
        window.location.replace('/expense/login.html');
    }
};
