import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/index.js';
import AppError from '../utils/AppError.js';
import { UserRole } from '../utils/constants.js';
import { formatUserForClient } from '../utils/userFormatter.js';

export const register = async (req, res, next) => {
    try {
        const { fullName, email, password } = req.body;
        if (!email || !password || !fullName) {
            return next(new AppError('Please provide full name, email, and password', 400));
        }

        const db = getDb();
        const existingUser = await db.collection('users').findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return next(new AppError('An account with this email already exists.', 409));
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        
        const newUser = {
            fullName,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: UserRole.USER,
            avatarUrl: null,
            createdAt: new Date().toISOString()
        };

        const result = await db.collection('users').insertOne(newUser);
        const userForClient = { ...newUser, _id: result.insertedId };

        const expiresIn = process.env.JWT_EXPIRES_IN || '90d';
        const signOptions = { expiresIn };
        const token = jwt.sign({ id: result.insertedId.toHexString() }, process.env.JWT_SECRET || 'a-very-secret-key', signOptions);

        res.status(201).json({
            status: 'success',
            token,
            user: formatUserForClient(userForClient),
        });

    } catch (error) {
        next(new AppError('An error occurred during registration.', 500));
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new AppError('Please provide email and password', 400));
        }

        const db = getDb();
        const user = await db.collection('users').findOne({ email: email.toLowerCase() });

        if (!user || !(user.password && await bcrypt.compare(password, user.password))) {
            return next(new AppError('Incorrect email or password', 401));
        }

        const expiresIn = process.env.JWT_EXPIRES_IN || '90d';
        const signOptions = { expiresIn };
        const token = jwt.sign({ id: user._id.toHexString() }, process.env.JWT_SECRET || 'a-very-secret-key', signOptions);

        res.status(200).json({
            status: 'success',
            token,
            user: formatUserForClient(user),
        });
    } catch (error) {
        next(new AppError('An error occurred during login.', 500));
    }
};