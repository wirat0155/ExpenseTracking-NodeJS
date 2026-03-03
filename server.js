require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const expenseRoutes = require('./routes/expenses');
const dashboardRoutes = require('./routes/dashboard');
const budgetRoutes = require('./routes/budgets');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/expense', express.static(path.join(__dirname, 'public')));

// Redirect root to the new subpath
app.get('/', (req, res) => {
    res.redirect('/expense/');
});

// Routes
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/budgets', budgetRoutes);

// Start server
const initializeDatabase = require('./db/autoInit');

initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
});
