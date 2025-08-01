// import express from 'express';
// import { protect, hasPermission } from '../middleware/authMiddleware.js';
// import { PERMISSIONS } from '../../config/permissions.js';
// import { getLeaveRequests, createLeaveRequest, getLeaveConfig, updateLeaveRequest } from '../controllers/leaveController.js';

// const router = express.Router();

// // All routes in this file are protected
// router.use(protect);

// router.route('/')
//   .get(
//     getLeaveRequests
//   )
//   .post(createLeaveRequest); 

// router.route('/config').get(getLeaveConfig);


// router.route('/:id')
//   .put(
//     hasPermission(PERMISSIONS.LEAVE_MANAGEMENT.UPDATE),
//     updateLeaveRequest
//   );

// export default router;


import express from 'express';
import { protect, hasPermission } from '../middleware/AuthMiddleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import {
    // We will REMOVE the old createLeaveRequest from this list
    getLeaveConfig,
    updateLeaveRequest,
    getMyLeaveRequests,
    getManagedLeaveRequests,
    validateLeaveRequest,
    createSingleLeaveRequest,
    createSplitLeaveRequest,

    getCalendarData
} from '../controllers/LeaveController.js';

const router = express.Router();

router.use(protect);

// --- The Correct and Final List of POST Routes ---
router.post('/validate', validateLeaveRequest);
router.post('/create-single', createSingleLeaveRequest);
router.post('/create-split', createSplitLeaveRequest);
router.get('/calendar-data', getCalendarData);

// --- The old `router.post('/', createLeaveRequest);` has been DELETED. ---

// --- The GET and PUT routes remain the same ---
router.get('/config', getLeaveConfig);
router.get('/my-requests', getMyLeaveRequests);
router.get('/manage', hasPermission(PERMISSIONS.LEAVE_MANAGEMENT.READ_ALL), getManagedLeaveRequests);
router.put('/:id', hasPermission(PERMISSIONS.LEAVE_MANAGEMENT.UPDATE), updateLeaveRequest);

export default router;