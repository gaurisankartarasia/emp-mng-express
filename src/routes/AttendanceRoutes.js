import express from 'express';
import { protect } from '../middleware/AuthMiddleware.js';
import { checkIn, checkOut, getTodaysAttendance } from '../controllers/AttendanceController.js';

const router = express.Router();

router.use(protect);

router.get('/today', getTodaysAttendance);
router.post('/check-in', checkIn);
router.put('/check-out', checkOut);

export default router;