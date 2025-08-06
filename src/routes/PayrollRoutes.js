import express from 'express';
import { protect, hasPermission } from '../middleware/AuthMiddleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { calculateMonthlySalary, getEmployeeList } from '../controllers/PayrollController.js';

const router = express.Router();

router.use(protect);

router.get('/list-employees', protect, getEmployeeList);

router.post(
    '/calculate',
    hasPermission(PERMISSIONS.PAYROLL.CALCULATE_SALARY),
    calculateMonthlySalary
);

export default router;