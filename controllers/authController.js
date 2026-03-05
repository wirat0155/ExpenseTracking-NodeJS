const { getPool, sql } = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { token, user: { id, email } }
 */
exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('email', sql.NVarChar(255), email.trim().toLowerCase())
            .query('SELECT Id, Email, PasswordHash FROM [dbo].[Users] WHERE LOWER(Email) = @email');

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.recordset[0];
        const isMatch = await bcrypt.compare(password, user.PasswordHash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { userId: user.Id, email: user.Email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            token,
            user: {
                id: user.Id,
                email: user.Email
            }
        });
    } catch (err) {
        console.error('login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
};

/**
 * GET /api/auth/me
 * Requires: Authorization: Bearer <token>
 * Returns: { id, email }
 */
exports.getMe = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.UniqueIdentifier, req.userId)
            .query('SELECT Id, Email, CreatedAt FROM [dbo].[Users] WHERE Id = @id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.recordset[0];
        res.json({
            id: user.Id,
            email: user.Email,
            createdAt: user.CreatedAt
        });
    } catch (err) {
        console.error('getMe error:', err);
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
};
