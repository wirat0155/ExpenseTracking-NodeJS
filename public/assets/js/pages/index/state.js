/**
 * state.js — Shared state for the index page DataTable
 */
window.IndexState = {
    page: 1,
    limit: 10,
    sortBy: 'ExpenseDate',
    sortDir: 'DESC',
    search: '',
    startDate: '',
    endDate: '',
    minAmount: 0,
    maxAmount: 10000,
    categories: [],
    totalPages: 0,
    totalItems: 0,

    // Will be loaded from API
    ALL_CATEGORIES: []
};
