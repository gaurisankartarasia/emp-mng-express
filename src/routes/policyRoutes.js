import express from 'express';
import { protect, hasPermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { getIncrementScheme } from '../controllers/incrementController.js';

const router = express.Router();

router.use(protect);

router.get(
    '/increment',
    hasPermission(PERMISSIONS.PAGES.INCREMENT_POLICY),
    getIncrementScheme
);

export default router;