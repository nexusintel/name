
import express from 'express';
import { 
    createApplication,
    getAllApplications,
    updateApplicationStatus
} from '../controllers/volunteer.controller.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';

const router = express.Router();

// --- AUTHENTICATED USER ROUTE ---
router.post('/apply', authMiddleware, createApplication);


// --- ADMIN-ONLY ROUTES ---
router.get('/applications', authMiddleware, adminOnly, getAllApplications);
router.put('/applications/:id', authMiddleware, adminOnly, updateApplicationStatus);


export default router;