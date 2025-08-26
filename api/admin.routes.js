
import express from 'express';
import { getDashboardStats, getUserGrowthStats } from '../controllers/admin.controller.js';
import { getUserGrowth, getMinistryStats, getPrayerStats } from '../controllers/admin.dashboard.controller.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/stats', authMiddleware, adminOnly, getDashboardStats);
router.get('/user-growth', authMiddleware, adminOnly, getUserGrowth);
router.get('/ministry-stats', authMiddleware, adminOnly, getMinistryStats);
router.get('/prayer-stats', authMiddleware, adminOnly, getPrayerStats);

// Legacy route for backward compatibility
router.get('/user-growth-legacy', authMiddleware, adminOnly, getUserGrowthStats);

export default router;
