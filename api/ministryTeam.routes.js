
import express from 'express';
import { 
    getPublicMinistryTeams, 
    getAllMinistryTeams, 
    createMinistryTeam, 
    updateMinistryTeam, 
    deleteMinistryTeam 
} from '../controllers/ministryTeam.controller.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';

const router = express.Router();

// Debug middleware for ministry team routes
router.use((req, res, next) => {
    console.log(`[Ministry Teams] ${req.method} ${req.originalUrl}`);
    console.log(`[Ministry Teams] Body:`, req.body);
    console.log(`[Ministry Teams] Headers:`, req.headers.authorization ? 'Auth header present' : 'No auth header');
    next();
});

// --- PUBLIC ROUTES ---
router.get('/public', getPublicMinistryTeams);

// --- ADMIN-ONLY ROUTES ---
router.get('/admin', authMiddleware, adminOnly, getAllMinistryTeams);
router.post('/', authMiddleware, adminOnly, createMinistryTeam);
router.put('/:id', authMiddleware, adminOnly, updateMinistryTeam);
router.delete('/:id', authMiddleware, adminOnly, deleteMinistryTeam);

export default router;