import express from 'express';
import {protect} from "../middleware/AuthMiddleware.js"
import { login, activateAccount, logout , getCurrentUser} from '../controllers/AuthController.js';

const router = express.Router();


router.post('/login', login);
router.post('/activate-account', activateAccount);
router.post('/logout', logout);
router.get('/session', protect, getCurrentUser);

export default router;