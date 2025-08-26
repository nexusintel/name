
import express from 'express';
import { 
    getPublicTestimonies,
    createTestimony,
    getAllTestimonies,
    updateTestimony,
    deleteTestimony
} from '../controllers/testimony.controller.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';

const router = express.Router();

// --- PUBLIC ROUTES ---
router.get('/public', getPublicTestimonies);
router.post('/', createTestimony);


// --- ADMIN-ONLY ROUTES ---
const adminRouter = express.Router();
adminRouter.use(authMiddleware, adminOnly);

adminRouter.get('/all', getAllTestimonies);
adminRouter.put('/:id', updateTestimony);
adminRouter.delete('/:id', deleteTestimony);

router.use('/admin', adminRouter);

export default router;
