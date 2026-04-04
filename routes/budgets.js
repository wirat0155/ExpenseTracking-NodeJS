const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');

router.get('/', budgetController.getBudget);
router.get('/master', budgetController.getMasterBudget);
router.get('/12-months', budgetController.get12MonthsBudget);
router.post('/', budgetController.setBudget);
router.post('/master', budgetController.updateMasterBudget);
router.get('/logs', budgetController.getBudgetLogs);

module.exports = router;
