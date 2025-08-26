
import jwt from 'jsonwebtoken';
import { getDb } from '../db/index.js';
import AppError from '../utils/AppError.js';
import { ObjectId } from 'mongodb';
import { UserRole } from '../utils/constants.js';

export const authMiddleware = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next(new AppError('You are not logged in. Please log in to get access.', 401));
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET || 'a-very-secret-key');

        if (typeof payload === 'string' || !payload.id) {
            return next(new AppError('Invalid token payload.', 401));
        }

        const db = getDb();
        const currentUser = await db.collection('users').findOne({ _id: new ObjectId(payload.id) });

        if (!currentUser) {
            return next(new AppError('The user belonging to this token does no longer exist.', 401));
        }
        
        // Grant access to protected route by attaching user to request
        req.user = currentUser;
        next();

    } catch(err) {
        if (err.name === 'JsonWebTokenError') {
             return next(new AppError('Invalid token. Please log in again.', 401));
        }
        return next(new AppError('Authentication failed. Please log in again.', 401));
    }
};

export const adminOnly = (req, res, next) => {
    if (!req.user || (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPER_ADMIN)) {
        return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
};

// Optional authentication middleware - doesn't block if no token is provided
export const optionalAuthMiddleware = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            // No token provided - continue without authentication
            req.user = null;
            return next();
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET || 'a-very-secret-key');

        if (typeof payload === 'string' || !payload.id) {
            // Invalid token - continue without authentication
            req.user = null;
            return next();
        }

        const db = getDb();
        const currentUser = await db.collection('users').findOne({ _id: new ObjectId(payload.id) });

        if (!currentUser) {
            // User not found - continue without authentication
            req.user = null;
            return next();
        }
        
        // Attach user to request if authenticated
        req.user = currentUser;
        next();

    } catch(err) {
        // Any authentication error - continue without authentication
        req.user = null;
        next();
    }
};
