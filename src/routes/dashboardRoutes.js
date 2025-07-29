import express from "express";
import { protect, hasPermission } from "../middleware/authMiddleware.js";
import { getDashboardSummary, getPerformanceCharts } from "../controllers/dashboardController.js";
import { PERMISSIONS } from "../../config/permissions.js";


const router = express.Router();

router.use(protect);

router.get("/summary", getDashboardSummary); 
router.get("/charts", getPerformanceCharts);

export default router;
