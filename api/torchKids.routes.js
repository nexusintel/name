import express from 'express';
import { getTorchKidsContent, updateTorchKidsContent } from '../controllers/torchKids.controller.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public route to get content
router.get('/', getTorchKidsContent);

// Admin routes
router.get('/admin', authMiddleware, adminOnly, getTorchKidsContent);
router.put('/admin', authMiddleware, adminOnly, updateTorchKidsContent);

export default router;