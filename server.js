// server.js

// -----------------------------------------------------------------------------
// IMPORTANT: Environment Variable Loading
// This MUST be the very first thing to run so that all other files/modules
// have access to the environment variables.
// -----------------------------------------------------------------------------
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables - ensure this is done before any other imports
const envPath = path.resolve(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.error(`\u26A0\uFE0F ERROR: .env file not found at ${envPath}`);
  console.error('Please create a .env file with required environment variables');
  process.exit(1); // Exit if no .env file
}

try {
  const result = dotenv.config({ path: envPath, override: true });
  
  if (result.error) {
    console.error('\u26A0\uFE0F Error loading .env file:', result.error);
  } else {
    console.log('\u2705 Environment variables loaded from .env file');
  }
} catch (error) {
  console.error('\u26A0\uFE0F Failed to load environment variables:', error);
  process.exit(1); // Exit if env loading fails
}

// Debug: Check if environment variables are loaded
console.log('Environment variables loaded:');
console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set' : 'Not set');
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');

// Direct console output of MongoDB URI to diagnose loading issues
if (process.env.MONGODB_URI) {
  const uri = process.env.MONGODB_URI;
  const masked = uri.substring(0, 20) + '****' + uri.substring(uri.length - 10);
  console.log('- MONGODB_URI value:', masked);
  console.log('- MONGODB_URI length:', uri.length);
  console.log('- MONGODB_URI type:', typeof uri);
} else {
  console.log('\u26a0\ufe0f MONGODB_URI is not defined! Check your .env file');
}

// -----------------------------------------------------------------------------
// Module Imports (Now that .env is loaded)
// -----------------------------------------------------------------------------
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

import { connectToDatabase, getDb } from './db/index.js';
import { ObjectId } from 'mongodb';
import AppError from './utils/AppError.js';
import errorHandler from './middleware/errorHandler.js';

// Initialize external services after environment variables are loaded
import './controllers/cloudinary.controller.js'; // Load cloudinary controller

// Import route modules

import authRoutes from './api/auth.routes.js';
import userRoutes from './api/users.routes.js';
import teachingRoutes from './api/teaching.routes.js';
import eventRoutes from './api/event.routes.js';
import prayerRequestRoutes from './api/prayerRequest.routes.js';
import siteContentRoutes from './api/siteContent.routes.js';
import messageRoutes from './api/message.routes.js';
import contactMessageRoutes from './api/contactMessage.routes.js';
import aiRoutes from './api/ai.routes.js';
import adminRoutes from './api/admin.routes.js';
import profileRoutes from './api/profile.routes.js';
import cloudinaryRoutes from './api/cloudinary.routes.js';
import leaderRoutes from './api/leader.routes.js';
import testimonyRoutes from './api/testimony.routes.js';
import ministryTeamRoutes from './api/ministryTeam.routes.js';
import newConvertsRoutes from './api/newConverts.routes.js';
import volunteerRoutes from './api/volunteer.routes.js';
import blogRoutes from './api/blog.routes.js';
import lightCampusRoutes from './api/lightCampus.routes.js';
import torchKidsRoutes from './api/torchKids.routes.js';



// -----------------------------------------------------------------------------
// Express App Initialization
// -----------------------------------------------------------------------------

// CORS configuration - define before using in Socket.IO
const corsOrigins = process.env.NODE_ENV === 'production' 
  ? [
      // Production origins - UPDATE THESE WITH YOUR ACTUAL DOMAINS
      'https://torchfellowship.netlify.app',  // Replace with your actual Netlify domain
      'https://torchfellowship.org',     // If you have a custom domain
      // Add additional production domains as needed
    ]
  

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    credentials: true
  }
});
const PORT = process.env.PORT || 3000;

// Socket.IO connection handling with comprehensive real-time features

// Store online users and their activity
const onlineUsers = new Map(); // userId -> { socketId, userName, lastActivity }
const userSockets = new Map(); // socketId -> userId
const typingUsers = new Map(); // roomId -> Set of { userId, userName }

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'a-very-secret-key');
    socket.userId = decoded.id;
    socket.userName = decoded.fullName || decoded.email || 'Anonymous';
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', async (socket) => {
  console.log(`🟢 User connected: ${socket.id} | User ID: ${socket.userId} | Name: ${socket.userName}`);
  
  // Store user as online
  onlineUsers.set(socket.userId, {
    socketId: socket.id,
    userName: socket.userName,
    lastActivity: Date.now()
  });
  userSockets.set(socket.id, socket.userId);
  
  // Broadcast user online status to all clients
  socket.broadcast.emit('user-online', { 
    userId: socket.userId, 
    userName: socket.userName 
  });
  
  // Send current online users to the newly connected user
  const currentOnlineUsers = Array.from(onlineUsers.entries()).map(([userId, data]) => ({
    userId,
    userName: data.userName,
    lastActivity: data.lastActivity
  }));
  socket.emit('online-users-list', currentOnlineUsers);
  
  // --- Room Management ---
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`🏠 User ${socket.userName} (${socket.userId}) joined room: ${roomId}`);
  });
  
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    console.log(`🚪 User ${socket.userName} (${socket.userId}) left room: ${roomId}`);
    
    // Clear typing status when leaving room
    if (typingUsers.has(roomId)) {
      const typing = typingUsers.get(roomId);
      const userTyping = Array.from(typing).find(t => t.userId === socket.userId);
      if (userTyping) {
        typing.delete(userTyping);
        socket.to(roomId).emit('user-stopped-typing', { 
          userId: socket.userId, 
          chatId: roomId 
        });
      }
    }
  });
  
  // --- Message Delivery and Read Status ---
  socket.on('message-delivered', async (messageId) => {
    try {
      const db = getDb();
      await db.collection('messages').updateOne(
        { _id: new ObjectId(messageId) },
        { $set: { delivered: true, deliveredAt: new Date() } }
      );
      
      const message = await db.collection('messages').findOne({ _id: new ObjectId(messageId) });
      if (message) {
        let roomId;
        if (message.chatType === 'private' && message.recipientId) {
          roomId = [message.authorId, message.recipientId].sort().join('-');
        } else if (message.chatType === 'community') {
          roomId = 'community';
        } else if (message.chatType === 'admin') {
          roomId = 'admin';
        }
        
        if (roomId) {
          io.to(roomId).emit('message-status-updated', { 
            messageId, 
            delivered: true,
            deliveredAt: new Date()
          });
        }
      }
    } catch (error) {
      console.error('❌ Error marking message as delivered:', error);
    }
  });
  
  socket.on('message-read', async (messageId) => {
    try {
      const db = getDb();
      await db.collection('messages').updateOne(
        { _id: new ObjectId(messageId) },
        { $set: { read: true, readAt: new Date() } }
      );
      
      const message = await db.collection('messages').findOne({ _id: new ObjectId(messageId) });
      if (message) {
        let roomId;
        if (message.chatType === 'private' && message.recipientId) {
          roomId = [message.authorId, message.recipientId].sort().join('-');
        } else if (message.chatType === 'community') {
          roomId = 'community';
        } else if (message.chatType === 'admin') {
          roomId = 'admin';
        }
        
        if (roomId) {
          io.to(roomId).emit('message-read', { 
            messageId, 
            userId: socket.userId 
          });
          io.to(roomId).emit('message-status-updated', { 
            messageId, 
            read: true,
            readAt: new Date()
          });
        }
      }
    } catch (error) {
      console.error('❌ Error marking message as read:', error);
    }
  });
  
  // --- Typing Indicators ---
  socket.on('user-typing', ({ chatId, userName }) => {
    console.log(`⌨️ User ${userName} is typing in ${chatId}`);
    
    if (!typingUsers.has(chatId)) {
      typingUsers.set(chatId, new Set());
    }
    
    const typing = typingUsers.get(chatId);
    const existingTyping = Array.from(typing).find(t => t.userId === socket.userId);
    
    if (!existingTyping) {
      typing.add({ userId: socket.userId, userName });
      socket.to(chatId).emit('user-typing', { 
        userId: socket.userId, 
        userName, 
        chatId 
      });
    }
    
    // Auto-clear typing after 3 seconds
    setTimeout(() => {
      const currentTyping = typingUsers.get(chatId);
      if (currentTyping) {
        const userTyping = Array.from(currentTyping).find(t => t.userId === socket.userId);
        if (userTyping) {
          currentTyping.delete(userTyping);
          socket.to(chatId).emit('user-stopped-typing', { 
            userId: socket.userId, 
            chatId 
          });
        }
      }
    }, 3000);
  });
  
  socket.on('user-stopped-typing', ({ chatId }) => {
    console.log(`⌨️ User ${socket.userName} stopped typing in ${chatId}`);
    
    if (typingUsers.has(chatId)) {
      const typing = typingUsers.get(chatId);
      const userTyping = Array.from(typing).find(t => t.userId === socket.userId);
      if (userTyping) {
        typing.delete(userTyping);
        socket.to(chatId).emit('user-stopped-typing', { 
          userId: socket.userId, 
          chatId 
        });
      }
    }
  });
  
  // --- User Activity Tracking ---
  socket.on('user-activity', () => {
    const userData = onlineUsers.get(socket.userId);
    if (userData) {
      userData.lastActivity = Date.now();
      onlineUsers.set(socket.userId, userData);
      
      // Broadcast activity to other users
      socket.broadcast.emit('user-activity', {
        userId: socket.userId,
        timestamp: userData.lastActivity
      });
    }
  });
  
  // --- Message Reactions ---
  socket.on('message-reaction', async ({ messageId, emoji }) => {
    try {
      const db = getDb();
      const message = await db.collection('messages').findOne({ _id: new ObjectId(messageId) });
      
      if (message) {
        // Add reaction to message
        const reaction = {
          userId: socket.userId,
          userName: socket.userName,
          emoji,
          createdAt: new Date()
        };
        
        await db.collection('messages').updateOne(
          { _id: new ObjectId(messageId) },
          { $push: { reactions: reaction } }
        );
        
        // Broadcast reaction to room
        let roomId;
        if (message.chatType === 'private' && message.recipientId) {
          roomId = [message.authorId, message.recipientId].sort().join('-');
        } else if (message.chatType === 'community') {
          roomId = 'community';
        } else if (message.chatType === 'admin') {
          roomId = 'admin';
        }
        
        if (roomId) {
          io.to(roomId).emit('reaction-added', {
            messageId,
            emoji,
            userId: socket.userId,
            userName: socket.userName
          });
        }
      }
    } catch (error) {
      console.error('❌ Error adding reaction:', error);
    }
  });
  
  // --- Connection Events ---
  socket.on('disconnect', () => {
    console.log(`🔴 User disconnected: ${socket.id} | User: ${socket.userName} (${socket.userId})`);
    
    // Remove from online users
    onlineUsers.delete(socket.userId);
    userSockets.delete(socket.id);
    
    // Clear typing status from all rooms
    for (const [roomId, typing] of typingUsers.entries()) {
      const userTyping = Array.from(typing).find(t => t.userId === socket.userId);
      if (userTyping) {
        typing.delete(userTyping);
        socket.to(roomId).emit('user-stopped-typing', { 
          userId: socket.userId, 
          chatId: roomId 
        });
      }
    }
    
    // Broadcast user offline status
    socket.broadcast.emit('user-offline', { userId: socket.userId });
  });
  
  // --- Private Chat Support ---
  socket.on('start-private-chat', (targetUserId) => {
    const roomId = [socket.userId, targetUserId].sort().join('-');
    socket.join(roomId);
    
    // Notify the target user if they're online
    const targetUser = onlineUsers.get(targetUserId);
    if (targetUser) {
      io.to(targetUser.socketId).emit('private-chat-started', {
        roomId,
        initiatorId: socket.userId,
        initiatorName: socket.userName
      });
    }
    
    console.log(`💬 Private chat started: ${roomId} | Participants: ${socket.userName}, Target: ${targetUserId}`);
  });
});

export const getIo = () => io;
export const getOnlineUsers = () => onlineUsers;


// -----------------------------------------------------------------------------
// Global Middleware
// -----------------------------------------------------------------------------
app.use(helmet()); // Set security HTTP headers

// Enable CORS with environment-specific origins
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Rate Limiter for general API requests
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

// Body Parsers
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// -----------------------------------------------------------------------------
// API Routes
// -----------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cloudinary', cloudinaryRoutes);
app.use('/api/leaders', leaderRoutes);
app.use('/api/testimonies', testimonyRoutes);
app.use('/api/teachings', teachingRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/prayer-requests', prayerRequestRoutes);
app.use('/api/site-content', siteContentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/contact-messages', contactMessageRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ministry-teams', ministryTeamRoutes);
app.use('/api/volunteer', volunteerRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/new-converts', newConvertsRoutes);
app.use('/api/light-campuses', lightCampusRoutes);
app.use('/api/torch-kids', torchKidsRoutes);

// -----------------------------------------------------------------------------
// Static File Serving (for Production)
// -----------------------------------------------------------------------------
// Temporarily commented out until frontend is built
// const clientPath = path.join(__dirname, '..', 'dist');
// app.use(express.static(clientPath));

// For any route that is not an API route, serve the React app's index.html
// app.get('*', (req, res, next) => {
//     // Check if the request is for an API endpoint
//     if (req.originalUrl.startsWith('/api/')) {
//         return next(new AppError('API endpoint not found', 404));
//     }
//     res.sendFile(path.resolve(clientPath, 'index.html'));
// });

// -----------------------------------------------------------------------------
// Error Handling
// -----------------------------------------------------------------------------
// Handle all routes that are not found
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Centralized error handling middleware
app.use(errorHandler);

// -----------------------------------------------------------------------------
// Server Startup
// -----------------------------------------------------------------------------
async function startServer() {
  try {
    // Connect to database first
    await connectToDatabase();
    
    // Start HTTP server with Socket.IO
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
      console.log(`🔌 Socket.IO server ready for real-time messaging`);
      console.log(`🔍 Debug mode enabled - all requests will be logged`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
