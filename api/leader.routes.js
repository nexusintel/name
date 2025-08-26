
import express from 'express';
import { getAllLeaders, createLeader, updateLeader, deleteLeader } from '../controllers/leader.controller.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public route to get all leaders
router.get('/', getAllLeaders);

// Admin-only routes for CRUD operations
router.post('/', authMiddleware, adminOnly, createLeader);
router.put('/:id', authMiddleware, adminOnly, updateLeader);
router.delete('/:id', authMiddleware, adminOnly, deleteLeader);

export default router;
