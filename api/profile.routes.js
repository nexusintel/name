
import express from 'express';
import { getMyProfile, updateMyProfile } from '../controllers/profile.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes in this file are protected and require a valid token
router.use(authMiddleware);

// Route for the logged-in user to GET their own profile
router.get('/me', getMyProfile);

// Route for the logged-in user to update their own profile
router.put('/me', updateMyProfile);

export default router;
