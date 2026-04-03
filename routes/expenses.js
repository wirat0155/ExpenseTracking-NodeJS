const express = require('express');
const router = express.Router();
const controller = require('../controllers/expenseController');

// Named routes must be before /:id to avoid conflict
router.get('/summary', controller.getSummary);
router.get('/calendar', controller.getCalendar);
router.get('/suggestions', controller.getSuggestions);
router.get('/', controller.getExpenses);
router.post('/', controller.createExpense);
router.delete('/:id', controller.deleteExpense);

module.exports = router;
