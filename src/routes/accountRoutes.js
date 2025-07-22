import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { upload, processAndSaveImage } from "../middleware/uploadMiddleware.js";

import {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
} from "../controllers/accountController.js";

const router = express.Router();

router.use(protect);

router.get("/me", getMyProfile);
router.put(
  "/me/profile",
  upload.single("picture"),
  processAndSaveImage,
  updateMyProfile
);
router.put("/me/password", changeMyPassword);

export default router;
