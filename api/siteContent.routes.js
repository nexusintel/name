
import express from 'express';
import { getContent, updateContent } from '../controllers/siteContent.controller.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';

const router = express.Router();

// All site content routes are admin-only
router.use(authMiddleware, adminOnly);

router.route('/')
    .get(getContent) // Expects a ?page=home query param
    .post(updateContent);

export default router;
