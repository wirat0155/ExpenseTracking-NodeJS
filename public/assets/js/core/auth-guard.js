/**
 * auth-guard.js — Redirect to login if not authenticated
 * Include this script BEFORE other scripts on protected pages.
 */
(function () {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        window.location.replace('/expense/login.html');
    }
    // Expose current user info globally
    try {
        window.CURRENT_USER = JSON.parse(localStorage.getItem('auth_user') || 'null');
    } catch (e) {
        window.CURRENT_USER = null;
    }
})();
