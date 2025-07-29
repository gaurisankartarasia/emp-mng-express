import express from 'express';
import { protect, hasPermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import {
    getLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType,
    getCompanyRules, updateCompanyRules
} from '../controllers/rulesController.js';

const router = express.Router();

// Protect all routes in this file
router.use(protect);
router.use(hasPermission(PERMISSIONS.PAGES.SETTINGS_MANAGEMENT));

// Leave Type Routes
router.route('/leave-types')
    .get(getLeaveTypes)
    .post(createLeaveType);

router.route('/leave-types/:id')
    .put(updateLeaveType)
    .delete(deleteLeaveType);

// Company Rule Routes
router.route('/company-rules')
    .get(getCompanyRules)
    .put(updateCompanyRules);

export default router;