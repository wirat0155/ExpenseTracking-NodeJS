const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for login endpoint
 * Limits to 5 attempts per 15 minutes to prevent brute force attacks
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { error: 'Too many login attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = { loginLimiter };