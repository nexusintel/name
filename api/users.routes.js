
import express from 'express';
import { getAllUsers, updateUserRole } from '../controllers/user.controller.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/users - Get all users (Admin only)
router.get('/', authMiddleware, adminOnly, getAllUsers);

// PUT /api/users/:id/role - Update a user's role (Admin only)
router.put('/:id/role', authMiddleware, adminOnly, updateUserRole);

export default router;
