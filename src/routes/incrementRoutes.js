import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { hasPermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { getIncrementReport } from '../controllers/incrementController.js';

const router = express.Router();

router.get(
    '/',
    protect,
    hasPermission([PERMISSIONS.PAGES.INCREMENT_REPORT, PERMISSIONS.INCREMENT_REPORT.READ]),
    getIncrementReport
);


export default router;