import { getDb } from '../db/index.js';
import { getIo, getOnlineUsers } from '../server.js';
import { ObjectId } from 'mongodb';
import AppError from '../utils/AppError.js';

export const getOnlineUsersEndpoint = async (req, res, next) => {
    try {
        const onlineUsers = getOnlineUsers();
        const users = Array.from(onlineUsers.entries()).map(([userId, data]) => ({
            userId,
            userName: data.userName,
            lastActivity: data.lastActivity,
            isOnline: true
        }));
        
        res.status(200).json(users);
    } catch (error) {
        next(new AppError('Failed to fetch online users.', 500));
    }
};

export const getUnreadCounts = async (req, res, next) => {
    try {
        const db = getDb();
        const userId = req.user._id.toHexString();
        
        // Get unread counts for private messages
        const unreadPrivate = await db.collection('messages').aggregate([
            {
                $match: {
                    recipientId: userId,
                    read: false
                }
            },
            {
                $group: {
                    _id: '$authorId',
                    count: { $sum: 1 }
                }
            }
        ]).toArray();
        
        // Get unread count for community messages
        const unreadCommunity = await db.collection('messages').countDocuments({
            chatType: 'community',
            authorId: { $ne: userId },
            read: false,
            created_at: { $gte: req.user.lastCommunityRead || new Date(0) }
        });
        
        // Get unread count for admin messages (if user is admin)
        let unreadAdmin = 0;
        if (req.user.role === 'Admin' || req.user.role === 'Super-Admin') {
            unreadAdmin = await db.collection('messages').countDocuments({
                chatType: 'admin',
                authorId: { $ne: userId },
                read: false,
                created_at: { $gte: req.user.lastAdminRead || new Date(0) }
            });
        }
        
        const counts = {
            private: unreadPrivate.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            community: unreadCommunity,
            admin: unreadAdmin
        };
        
        res.status(200).json(counts);
    } catch (error) {
        console.error('Error getting unread counts:', error);
        next(new AppError('Failed to fetch unread counts.', 500));
    }
};

export const getCommunityMessages = async (req, res, next) => {
    try {
        const db = getDb();
        const dbMessages = await db.collection('messages')
            .find({ recipientId: { $exists: false }, chatType: { $ne: 'admin' } })
            .sort({ created_at: 1 })
            .limit(100)
            .toArray();
        const messages = dbMessages.map((m) => ({...m, _id: m._id.toHexString()}));
        res.status(200).json(messages);
    } catch (error) {
        next(new AppError('Failed to fetch community messages.', 500));
    }
};

export const getAdminMessages = async (req, res, next) => {
    try {
        const db = getDb();
        const userRole = req.user.role;
        
        if (userRole !== 'Admin' && userRole !== 'Super-Admin') {
            return next(new AppError('Access denied. Admin privileges required.', 403));
        }
        
        const dbMessages = await db.collection('messages')
            .find({ chatType: 'admin' })
            .sort({ created_at: 1 })
            .limit(100)
            .toArray();
        const messages = dbMessages.map((m) => ({...m, _id: m._id.toHexString()}));
        res.status(200).json(messages);
    } catch (error) {
        next(new AppError('Failed to fetch admin messages.', 500));
    }
};

export const getPrivateMessages = async (req, res, next) => {
    try {
        const db = getDb();
        const { userId } = req.query;
        const currentUserId = req.user._id.toHexString();

        if (!userId) {
            return next(new AppError('User ID is required to fetch private messages.', 400));
        }

        const dbMessages = await db.collection('messages').find({
            $or: [
                { authorId: currentUserId, recipientId: userId },
                { authorId: userId, recipientId: currentUserId }
            ]
        }).sort({ created_at: 1 }).toArray();

        const messages = dbMessages.map((m) => ({...m, _id: m._id.toHexString()}));
        res.status(200).json(messages);
    } catch (error) {
        next(new AppError('Failed to fetch private messages.', 500));
    }
};
export const createMessage = async (req, res, next) => {
    try {
        const db = getDb();
        const io = getIo();
        const newMessageData = {
            ...req.body,
            authorId: req.user._id.toHexString(),
            created_at: new Date().toISOString(),
            delivered: false,
            read: false,
            reactions: []
        };
        
        // Validate admin chat access
        if (newMessageData.chatType === 'admin') {
            const userRole = req.user.role;
            if (userRole !== 'Admin' && userRole !== 'Super-Admin') {
                return next(new AppError('Access denied. Admin privileges required.', 403));
            }
        }

        const result = await db.collection('messages').insertOne(newMessageData);
        const createdMessage = {...newMessageData, _id: result.insertedId.toHexString()};
        
        // Determine room ID based on message type
        let roomId;
        if (newMessageData.chatType === 'admin') {
            roomId = 'admin';
        } else if (newMessageData.chatType === 'community') {
            roomId = 'community';
        } else if (newMessageData.recipientId) {
            roomId = [newMessageData.authorId, newMessageData.recipientId].sort().join('-');
        } else {
            roomId = 'community'; // Default fallback
        }
        
        // Emit real-time message
        io.to(roomId).emit('new-message', createdMessage);
        
        // Mark as delivered immediately for community and admin messages
        if (newMessageData.chatType === 'community' || newMessageData.chatType === 'admin') {
            await db.collection('messages').updateOne(
                { _id: result.insertedId },
                { $set: { delivered: true, deliveredAt: new Date() } }
            );
            createdMessage.delivered = true;
            createdMessage.deliveredAt = new Date();
        }
        
        res.status(201).json(createdMessage);
    } catch (error) {
        console.error('Error creating message:', error);
        next(new AppError('Failed to send message.', 500));
    }
};

export const markMessageAsDelivered = async (req, res, next) => {
    try {
        const db = getDb();
        const { messageId } = req.params;
        
        await db.collection('messages').updateOne(
            { _id: new ObjectId(messageId) },
            { $set: { delivered: true } }
        );
        
        res.status(200).json({ success: true });
    } catch (error) {
        next(new AppError('Failed to mark message as delivered.', 500));
    }
};

export const markMessageAsRead = async (req, res, next) => {
    try {
        const db = getDb();
        const io = getIo();
        const { messageId } = req.params;
        const userId = req.user._id.toHexString();
        
        const message = await db.collection('messages').findOne({ _id: new ObjectId(messageId) });
        if (!message) {
            return next(new AppError('Message not found.', 404));
        }
        
        // Only allow recipient to mark as read (or author for community/admin messages)
        if (message.recipientId && message.recipientId !== userId && message.authorId !== userId) {
            return next(new AppError('Unauthorized to mark this message as read.', 403));
        }
        
        await db.collection('messages').updateOne(
            { _id: new ObjectId(messageId) },
            { 
                $set: { 
                    read: true, 
                    delivered: true,
                    readAt: new Date(),
                    deliveredAt: new Date()
                } 
            }
        );
        
        // Notify about read receipt
        let roomId;
        if (message.chatType === 'admin') {
            roomId = 'admin';
        } else if (message.chatType === 'community') {
            roomId = 'community';
        } else if (message.recipientId) {
            roomId = [message.authorId, message.recipientId].sort().join('-');
        }
        
        if (roomId) {
            io.to(roomId).emit('message-read', { messageId, userId });
            io.to(roomId).emit('message-status-updated', { 
                messageId, 
                read: true, 
                delivered: true,
                readAt: new Date()
            });
        }
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error marking message as read:', error);
        next(new AppError('Failed to mark message as read.', 500));
    }
};

export const addReaction = async (req, res, next) => {
    try {
        const db = getDb();
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user._id.toHexString();
        
        const message = await db.collection('messages').findOne({ _id: new ObjectId(messageId) });
        if (!message) {
            return next(new AppError('Message not found.', 404));
        }
        
        const reactions = message.reactions || {};
        if (!reactions[emoji]) {
            reactions[emoji] = { count: 0, users: [] };
        }
        
        const userIndex = reactions[emoji].users.indexOf(userId);
        if (userIndex > -1) {
            // Remove reaction
            reactions[emoji].users.splice(userIndex, 1);
            reactions[emoji].count--;
            if (reactions[emoji].count === 0) {
                delete reactions[emoji];
            }
        } else {
            // Add reaction
            reactions[emoji].users.push(userId);
            reactions[emoji].count++;
        }
        
        await db.collection('messages').updateOne(
            { _id: new ObjectId(messageId) },
            { $set: { reactions } }
        );
        
        res.status(200).json({ success: true });
    } catch (error) {
        next(new AppError('Failed to add reaction.', 500));
    }
};