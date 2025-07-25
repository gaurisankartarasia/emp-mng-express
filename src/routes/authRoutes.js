import express from 'express';
import { login, activateAccount } from '../controllers/authController.js';

const router = express.Router();


router.post('/login', login);
router.post('/activate-account', activateAccount);

export default router;