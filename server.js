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
  : [
      // Development origins
      'http://localhost:5173', 
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ];

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    credentials: true
  }
});
const PORT = process.env.PORT || 5000;

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
// Global Middleware with Enhanced Security
// -----------------------------------------------------------------------------

// Enhanced Helmet configuration for production security
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://*.cloudinary.com'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'ws:', 'wss:', ...corsOrigins],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  } : false, // Disable CSP in development for easier debugging
  crossOriginEmbedderPolicy: false, // Allow embedding for Socket.IO
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// Enhanced CORS with security options
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log unauthorized CORS attempts in production
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Unauthorized CORS origin attempted:', origin);
    }
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  optionsSuccessStatus: 200, // Support legacy browsers
  maxAge: 86400, // Cache preflight response for 24 hours
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
  allowedHeaders: [
    'Origin', 
    'X-Requested-With', 
    'Content-Type', 
    'Accept', 
    'Authorization',
    'Cache-Control',
    'X-CSRF-Token'
  ]
}));

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Environment-specific rate limiting
const getRateLimitConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    return {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 15 * 60 // 15 minutes in seconds
      },
      // Skip rate limiting for health checks
      skip: (req) => {
        return req.path.startsWith('/health') || 
               req.path.startsWith('/ready') || 
               req.path.startsWith('/live') ||
               req.path.startsWith('/metrics');
      },
      // Custom key generator for better rate limiting
      keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress;
      },
      // Handle rate limit exceeded
      handler: (req, res) => {
        console.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: 15 * 60
        });
      }
    };
  } else {
    // More lenient for development/staging
    return {
      windowMs: 15 * 60 * 1000,
      max: 1000, // Much higher limit for development
      standardHeaders: true,
      legacyHeaders: false,
      message: 'Rate limit exceeded in development mode'
    };
  }
};

const apiLimiter = rateLimit(getRateLimitConfig());
app.use('/api/', apiLimiter);

// Body Parsers
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// -----------------------------------------------------------------------------
// Health Check Endpoints for Load Balancer
// -----------------------------------------------------------------------------

// Basic health check endpoint
app.get('/health', async (req, res) => {
  try {
    const db = getDb();
    
    // Quick database ping
    await db.admin().ping();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      pid: process.pid
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed health check endpoint with dependency checks
app.get('/health/detailed', async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: { status: 'unknown' },
      memory: { status: 'unknown' },
      socket: { status: 'unknown' }
    }
  };

  let overallHealthy = true;

  try {
    // Database health check
    const db = getDb();
    const dbStart = Date.now();
    await db.admin().ping();
    const dbLatency = Date.now() - dbStart;
    
    healthStatus.checks.database = {
      status: 'healthy',
      latency: `${dbLatency}ms`,
      connection: 'active'
    };
  } catch (error) {
    healthStatus.checks.database = {
      status: 'unhealthy',
      error: error.message
    };
    overallHealthy = false;
  }

  // Memory health check
  const memUsage = process.memoryUsage();
  const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const memPercentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
  
  if (memPercentage > 90) {
    healthStatus.checks.memory = {
      status: 'warning',
      used: `${memUsedMB}MB`,
      total: `${memTotalMB}MB`,
      percentage: `${memPercentage}%`,
      message: 'High memory usage'
    };
  } else {
    healthStatus.checks.memory = {
      status: 'healthy',
      used: `${memUsedMB}MB`,
      total: `${memTotalMB}MB`,
      percentage: `${memPercentage}%`
    };
  }

  // Socket.IO health check
  try {
    const connectedUsers = onlineUsers.size;
    healthStatus.checks.socket = {
      status: 'healthy',
      connectedUsers,
      engine: 'socket.io'
    };
  } catch (error) {
    healthStatus.checks.socket = {
      status: 'unhealthy',
      error: error.message
    };
    overallHealthy = false;
  }

  healthStatus.status = overallHealthy ? 'healthy' : 'unhealthy';
  const statusCode = overallHealthy ? 200 : 503;
  
  res.status(statusCode).json(healthStatus);
});

// Readiness probe for Kubernetes/container orchestration
app.get('/ready', async (req, res) => {
  try {
    const db = getDb();
    await db.admin().ping();
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Liveness probe for Kubernetes/container orchestration
app.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid
  });
});

// Server metrics endpoint for monitoring
app.get('/metrics', (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    pid: process.pid,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    socketConnections: onlineUsers.size,
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.status(200).json(metrics);
});

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
// Root Route and Static Assets
// -----------------------------------------------------------------------------
// Root route - API information
app.get('/', (req, res) => {
  res.json({
    name: 'Torch Fellowship Backend API',
    version: '1.0.0',
    description: 'Production-ready backend service for Torch Fellowship',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api',
      docs: 'API documentation available at /api endpoints'
    },
    status: 'operational'
  });
});

// Handle favicon requests to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content
});

// Handle robots.txt for production
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  if (process.env.NODE_ENV === 'production') {
    res.send('User-agent: *\nAllow: /\n\nSitemap: https://' + req.get('host') + '/sitemap.xml');
  } else {
    res.send('User-agent: *\nDisallow: /');
  }
});

// -----------------------------------------------------------------------------
// Error Handling
// -----------------------------------------------------------------------------
// Handle all routes that are not found
app.all('*', (req, res, next) => {
  // Skip favicon and common browser requests that shouldn't be logged as errors
  if (req.originalUrl.match(/\.(ico|png|jpg|jpeg|gif|css|js|woff|woff2|ttf|eot|svg)$/)) {
    return res.status(404).end();
  }
  
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Centralized error handling middleware
app.use(errorHandler);

// -----------------------------------------------------------------------------
// Graceful Shutdown Handling
// -----------------------------------------------------------------------------

// Import logger if available
let logger;
try {
  const loggerModule = await import('./utils/logger.js');
  logger = loggerModule.default;
} catch (error) {
  // Fallback to console if logger is not available
  logger = console;
}

// Flag to track if shutdown is in progress
let isShuttingDown = false;

// Graceful shutdown function
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, forcing exit...');
    process.exit(1);
  }
  
  isShuttingDown = true;
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Set a timeout for forced shutdown
  const forceShutdownTimer = setTimeout(() => {
    logger.error('Forced shutdown - graceful shutdown took too long');
    process.exit(1);
  }, 30000); // 30 seconds timeout
  
  try {
    // Stop accepting new connections
    logger.info('Closing HTTP server...');
    server.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        // Close Socket.IO connections
        logger.info('Closing Socket.IO connections...');
        
        // Notify all connected users about server shutdown
        io.emit('server-shutdown', {
          message: 'Server is shutting down for maintenance. Please reconnect in a moment.',
          timestamp: new Date().toISOString()
        });
        
        // Give clients time to receive the message
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Close all Socket.IO connections
        io.close(() => {
          logger.info('Socket.IO server closed');
        });
        
        // Close database connections
        logger.info('Closing database connections...');
        const { closeDatabase } = await import('./db/index.js');
        if (closeDatabase) {
          await closeDatabase();
          logger.info('Database connections closed');
        }
        
        // Clear the forced shutdown timer
        clearTimeout(forceShutdownTimer);
        
        logger.info('Graceful shutdown completed successfully');
        process.exit(0);
        
      } catch (error) {
        logger.error('Error during shutdown process:', error);
        clearTimeout(forceShutdownTimer);
        process.exit(1);
      }
    });
    
    // Stop accepting new HTTP connections
    server.keepAliveTimeout = 5000;
    server.headersTimeout = 10000;
    
  } catch (error) {
    logger.error('Error initiating graceful shutdown:', error);
    clearTimeout(forceShutdownTimer);
    process.exit(1);
  }
};

// Handle process signals for graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // PM2 stop/restart
process.on('SIGINT', () => gracefulShutdown('SIGINT'));   // Ctrl+C
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));   // Terminal closed

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// PM2 specific graceful shutdown
process.on('message', (msg) => {
  if (msg === 'shutdown') {
    logger.info('Received PM2 shutdown message');
    gracefulShutdown('PM2_SHUTDOWN');
  }
});

// For Docker containers - handle SIGTERM properly
if (process.env.NODE_ENV === 'production') {
  // Ensure we respond to SIGTERM within 10 seconds
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received in production mode');
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  });
}

// Health check to indicate readiness (important for Kubernetes/Docker)
const setServerReady = () => {
  // Signal to PM2 that the server is ready
  if (process.send) {
    process.send('ready');
  }
  
  logger.info('Server is ready to accept connections');
};

// -----------------------------------------------------------------------------
// Server Startup with Graceful Handling
// -----------------------------------------------------------------------------
async function startServer() {
  try {
    // Connect to database first
    await connectToDatabase();
    logger.info('Database connection established');
    
    // Start HTTP server with Socket.IO
    server.listen(PORT, () => {
      logger.info(`🚀 Server is running on http://localhost:${PORT}`);
      logger.info(`📡 API endpoints available at http://localhost:${PORT}/api`);
      logger.info(`🔌 Socket.IO server ready for real-time messaging`);
      logger.info(`🔍 Debug mode enabled - all requests will be logged`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📊 Health checks available at http://localhost:${PORT}/health`);
      
      // Signal that server is ready
      setServerReady();
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        logger.error('Server error:', error);
        process.exit(1);
      }
    });
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
