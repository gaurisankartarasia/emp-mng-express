import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getDashboardSummary, getCombinedPerformanceData  } from '../controllers/dashboardController.js';

const router = express.Router();

router.use(protect)

router.get('/summary',  getDashboardSummary);
// router.get('/performance-chart', getPerformanceChartData);
router.get('/charts', getCombinedPerformanceData);

export default router;