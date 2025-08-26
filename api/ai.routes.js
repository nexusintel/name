
import express from 'express';
import { streamChat } from '../controllers/ai.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/chat', streamChat);

export default router;
