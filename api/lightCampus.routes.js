
import express from 'express';
import { 
    getPublicCampuses,
    applyForCampus,
    getAllCampusesAdmin,
    createCampusAdmin,
    updateCampusAdmin,
    deleteCampusAdmin,
    getAllApplicationsAdmin,
    approveApplicationAdmin,
    rejectApplicationAdmin,
    addCampusImages,
    removeCampusImage
} from '../controllers/lightCampus.controller.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';

const router = express.Router();

// --- PUBLIC & AUTHENTICATED ROUTES ---
router.get('/public', getPublicCampuses);
router.post('/apply', authMiddleware, applyForCampus);


// --- ADMIN-ONLY ROUTES ---
const adminRouter = express.Router();
adminRouter.use(authMiddleware, adminOnly);

// Manage Campuses
adminRouter.get('/all', getAllCampusesAdmin);
adminRouter.post('/', createCampusAdmin);
adminRouter.put('/:id', updateCampusAdmin);
adminRouter.delete('/:id', deleteCampusAdmin);

// Manage Applications
adminRouter.get('/applications', getAllApplicationsAdmin);
adminRouter.put('/applications/:id/approve', approveApplicationAdmin);
adminRouter.put('/applications/:id/reject', rejectApplicationAdmin);

// Manage Campus Media
adminRouter.post('/:id/images', addCampusImages);
adminRouter.delete('/:id/images/:imageId', removeCampusImage);

router.use('/admin', adminRouter);

export default router;
