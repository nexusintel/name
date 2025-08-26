
import express from 'express';
import { getUploadSignature } from '../controllers/cloudinary.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/signature', authMiddleware, getUploadSignature);

export default router;
