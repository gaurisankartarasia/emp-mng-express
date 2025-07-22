// import express from 'express';
// import { getEmployees, createEmployee, getEmployeeById, updateEmployee, deleteEmployee, getManageableEmployees } from '../controllers/employeeController.js'; // <-- IMPORT createEmployee
// import { protect, hasPermission } from '../middleware/authMiddleware.js';
// import { PERMISSIONS } from '../../config/permissions.js'; // <-- Import PERMISSIONS from your server config

// const router = express.Router();

// router.get(
//   '/',
//   protect,
//   hasPermission(PERMISSIONS.VIEW_EMPLOYEE_MANAGEMENT),
//   getEmployees
// );

// router.post(
//   '/',
//   protect,
//   hasPermission(PERMISSIONS.VIEW_EMPLOYEE_MANAGEMENT),
//   createEmployee
// );

// router.get(
//   '/:id',
//   protect,
//   hasPermission(PERMISSIONS.VIEW_EMPLOYEE_MANAGEMENT),
//   getEmployeeById
// );

// router.get(
//     '/manageable',
//     protect,
//     hasPermission(PERMISSIONS.MANAGE_EMPLOYEE_PERMISSIONS), // Secure with the correct permission
//     getManageableEmployees
// );

// router.put(
//   '/:id',
//   protect,
//   hasPermission(PERMISSIONS.VIEW_EMPLOYEE_MANAGEMENT),
//   updateEmployee
// );

// router.delete(
//   '/:id',
//   protect,
//   hasPermission(PERMISSIONS.VIEW_EMPLOYEE_MANAGEMENT),
//   deleteEmployee
// );

// export default router;


import express from "express";
import {
  getEmployees,
  createEmployee,
  deleteEmployee,
  updateEmployee,
  getEmployeeById,
  getManageableEmployees,
} from "../controllers/employeeController.js";
import { protect, hasPermission } from "../middleware/authMiddleware.js";
import { PERMISSIONS } from "../../config/permissions.js";
import { upload, processAndSaveImage } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  hasPermission([PERMISSIONS.PAGES.EMPLOYEE_MANAGEMENT, PERMISSIONS.EMPLOYEE.READ]),
  getEmployees
);
router.post(
  "/",
  protect,
  hasPermission([PERMISSIONS.PAGES.EMPLOYEE_MANAGEMENT, PERMISSIONS.EMPLOYEE.CREATE]),
  upload.single("picture"),
  processAndSaveImage,
  createEmployee
);

// for employee permission management page=====================================
router.get(
  "/manageable",
  protect,
  hasPermission([PERMISSIONS.PAGES.MANAGE_EMPLOYEE_PERMISSIONS, PERMISSIONS.EMPLOYEE_PERMISSIONS_MANAGE.READ]),
  getManageableEmployees
);

//=================================================================

router.get(
  "/:id",
  protect,
  hasPermission([PERMISSIONS.PAGES.EMPLOYEE_MANAGEMENT, PERMISSIONS.EMPLOYEE.UPDATE]),
  getEmployeeById
);

router.put(
  "/:id",
  protect,
 hasPermission([PERMISSIONS.PAGES.EMPLOYEE_MANAGEMENT, PERMISSIONS.EMPLOYEE.UPDATE]),
  upload.single("picture"),
  processAndSaveImage,
  updateEmployee
);
router.delete(
  "/:id",
  protect,
hasPermission([PERMISSIONS.PAGES.EMPLOYEE_MANAGEMENT, PERMISSIONS.EMPLOYEE.DELETE]),
  deleteEmployee
);

export default router;
