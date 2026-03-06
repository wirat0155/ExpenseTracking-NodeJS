require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const authMiddleware = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const dashboardRoutes = require('./routes/dashboard');
const budgetRoutes = require('./routes/budgets');
const categoryRoutes = require('./routes/categories');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse CORS origins from environment
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim());

// Security: HTTP headers
app.use(helmet());

// Security: CORS configuration
app.use(cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json());

app.use('/expense', express.static(path.join(__dirname, 'public')));

// Redirect root to the new subpath
app.get('/', (req, res) => {
    res.redirect('/expense/');
});

// Public Routes (no auth required)
app.use('/api/auth', authRoutes);

// Protected Routes (require valid JWT)
app.use('/api/expenses', authMiddleware, expenseRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/budgets', authMiddleware, budgetRoutes);
app.use('/api/categories', authMiddleware, categoryRoutes);

// Start server
const initializeDatabase = require('./db/autoInit');

initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
});
