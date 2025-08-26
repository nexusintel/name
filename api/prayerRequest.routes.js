
import express from 'express';
import { 
    getAllPrayerRequests,
    getPublicPrayerRequests,
    createPublicPrayerRequest, 
    updatePrayerRequest, 
    deletePrayerRequest 
} from '../controllers/prayerRequest.controller.js';
import { authMiddleware, adminOnly, optionalAuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// --- PUBLIC ROUTES ---

// GET /api/prayer-requests/public - Get all public, unanswered prayer requests for the wall
router.get('/public', getPublicPrayerRequests);

// POST /api/prayer-requests - Create a new prayer request from the public form
router.post('/', optionalAuthMiddleware, createPublicPrayerRequest);


// --- ADMIN-ONLY ROUTES ---
const adminRouter = express.Router();
adminRouter.use(authMiddleware, adminOnly);

// GET /api/prayer-requests/admin/all - Get ALL prayer requests
adminRouter.get('/all', getAllPrayerRequests);

// PUT /api/prayer-requests/admin/:id - Update a request (e.g., mark as answered)
adminRouter.put('/:id', updatePrayerRequest);

// DELETE /api/prayer-requests/admin/:id - Delete a request
adminRouter.delete('/:id', deletePrayerRequest);

router.use('/admin', adminRouter);

export default router;
