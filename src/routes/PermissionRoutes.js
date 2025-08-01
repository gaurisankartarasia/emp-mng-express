import express from "express";
import { protect, hasPermission } from "../middleware/AuthMiddleware.js";
import { PERMISSIONS } from "../../config/permissions.js";
import {
  getAllPermissions,
  getEmployeePermissions,
  updateEmployeePermissions,
} from "../controllers/PermissionController.js";

const router = express.Router();

router.use(protect, hasPermission(PERMISSIONS.PAGES.MANAGE_EMPLOYEE_PERMISSIONS));

router.get(
  "/all",
  protect,
  hasPermission([PERMISSIONS.EMPLOYEE_PERMISSIONS_MANAGE.READ]),
  getAllPermissions
);
router.get("/employee/:employeeId", protect, hasPermission([PERMISSIONS.EMPLOYEE_PERMISSIONS_MANAGE.READ]), getEmployeePermissions);
router.put("/employee/:employeeId", protect, hasPermission([PERMISSIONS.EMPLOYEE_PERMISSIONS_MANAGE.UPDATE]), updateEmployeePermissions);

export default router;
