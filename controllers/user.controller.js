import { getDb } from '../db/index.js';
import AppError from '../utils/AppError.js';
import { ObjectId } from 'mongodb';
import { UserRole } from '../utils/constants.js';
import { formatUserForClient } from '../utils/userFormatter.js';

export const getAllUsers = async (req, res, next) => {
    try {
        const db = getDb();
        const users = await db.collection('users').find({}).sort({ createdAt: -1 }).toArray();
        res.status(200).json(users.map(user => formatUserForClient(user)));
    } catch (error) {
        next(new AppError('Could not retrieve users.', 500));
    }
};

export const updateUserRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const db = getDb();

        if (!Object.values(UserRole).includes(role)) {
            return next(new AppError('Invalid role specified.', 400));
        }

        if (role === UserRole.SUPER_ADMIN) {
             return next(new AppError('Cannot assign Super-Admin role.', 403));
        }

        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(id) },
            { $set: { role: role } }
        );

        if (result.matchedCount === 0) {
            return next(new AppError('User not found.', 404));
        }

        res.status(200).json({ status: 'success', message: 'User role updated.' });
    } catch (error) {
        next(new AppError('Could not update user role.', 500));
    }
};