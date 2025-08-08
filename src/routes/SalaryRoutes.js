import express from 'express';
import { protect, hasPermission } from '../middleware/AuthMiddleware.js';
// import { PERMISSIONS } from '../../config/permissions.js';

const router = express.Router();
router.use(protect); 
// router.use(hasPermission(PERMISSIONS.PAGES.SALARY_MANAGEMENT)); 

import {
    getSalaryComponents, createSalaryComponent, updateSalaryComponent, deleteSalaryComponent, getEmployeeSalaryStructure, updateEmployeeSalaryStructure
} from '../controllers/SalaryController.js';

router.route('/components')
    .get(getSalaryComponents)
    .post(createSalaryComponent);

router.route('/components/:id')
    .put(updateSalaryComponent)
    .delete(deleteSalaryComponent);

    router.route('/structure/:employeeId')
    .get(getEmployeeSalaryStructure)
    .post(updateEmployeeSalaryStructure);

export default router;