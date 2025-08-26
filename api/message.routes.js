
import express from 'express';
import { getCommunityMessages, getAdminMessages, getPrivateMessages, createMessage, markMessageAsDelivered, markMessageAsRead, addReaction, getOnlineUsersEndpoint, getUnreadCounts } from '../controllers/message.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// All message routes require authentication
router.use(authMiddleware);

router.get('/community', getCommunityMessages);
router.get('/admin', getAdminMessages);
router.get('/private', getPrivateMessages); // Expects ?userId=...
router.get('/online-users', getOnlineUsersEndpoint);
router.get('/unread-counts', getUnreadCounts);
router.post('/', createMessage);
router.put('/:messageId/delivered', markMessageAsDelivered);
router.put('/:messageId/read', markMessageAsRead);
router.post('/:messageId/react', addReaction);

export default router;