const { getPool, sql } = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');

/**
 * Password complexity requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string()
        .min(8)
        .pattern(passwordComplexityRegex)
        .message('Password must be at least 8 characters with uppercase, lowercase, number, and special character')
        .required()
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { token, user: { id, email } }
 */
exports.login = async (req, res) => {
    try {
        // Input validation
        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { email, password } = value;

        // Database lookup
        const pool = await getPool();
        const result = await pool.request()
            .input('email', sql.NVarChar(255), email.trim().toLowerCase())
            .query('SELECT Id, Email, PasswordHash FROM [dbo].[Users] WHERE LOWER(Email) = @email');

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.recordset[0];

        // Password verification
        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT
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
