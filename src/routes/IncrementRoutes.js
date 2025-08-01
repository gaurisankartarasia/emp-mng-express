import express from 'express';
import { protect, hasPermission } from '../middleware/AuthMiddleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { getIncrementReport } from '../controllers/IncrementController.js';

const router = express.Router();

router.get(
    '/',
    protect,
    hasPermission([PERMISSIONS.PAGES.INCREMENT_REPORT, PERMISSIONS.INCREMENT_REPORT.READ]),
    getIncrementReport
);


export default router;