const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// POST /api/auth/login — public, no auth required
router.post('/login', controller.login);

// GET /api/auth/me — requires valid JWT
router.get('/me', authMiddleware, controller.getMe);

module.exports = router;
