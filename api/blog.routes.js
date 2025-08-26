
import express from 'express';
import {
    createPost,
    updatePost,
    deletePost,
    getAllPostsAdmin,
    getPublishedPosts,
    getPostBySlug,
} from '../controllers/blog.controller.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';

const router = express.Router();

// --- PUBLIC ROUTES ---
router.get('/', getPublishedPosts);
router.get('/:slug', getPostBySlug);

// --- ADMIN-ONLY ROUTES ---
router.get('/admin/all', authMiddleware, adminOnly, getAllPostsAdmin);
router.post('/', authMiddleware, adminOnly, createPost);
router.put('/:id', authMiddleware, adminOnly, updatePost);
router.delete('/:id', authMiddleware, adminOnly, deletePost);

export default router;