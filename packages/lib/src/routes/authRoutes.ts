import { Router } from 'express';
import { login, logout, check, loginPage } from '../controllers/authController.js';

const router = Router();

router.post('/login', login);
router.get('/logout', logout);
router.get('/check', check);
router.get('/login', loginPage);

export default router;
