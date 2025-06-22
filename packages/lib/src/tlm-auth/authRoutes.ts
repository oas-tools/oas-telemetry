import { Router } from 'express';
import { login, logout, check } from './authController.js';

const router = Router();

router.post('/login', login);
router.get('/logout', logout);
router.get('/check', check);

export default router;
