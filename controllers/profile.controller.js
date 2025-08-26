
import { getDb } from '../db/index.js';
import AppError from '../utils/AppError.js';

export const getDashboardStats = async (req, res, next) => {
    try {
        const db = getDb();
        const users = await db.collection('users').countDocuments();
        const teachings = await db.collection('teachings').countDocuments();
        const events = await db.collection('events').countDocuments();
        const prayers = await db.collection('prayer_requests').countDocuments();
        const leaders = await db.collection('leaders').countDocuments();
        const testimonies = await db.collection('testimonies').countDocuments();
        const ministryTeams = await db.collection('ministry_teams').countDocuments();
        const blogPosts = await db.collection('blog_posts').countDocuments();
        const lightCampuses = await db.collection('light_campuses').countDocuments({ isActive: true });
        const campusApplications = await db.collection('light_campus_applications').countDocuments({ status: 'Pending' });

        res.status(200).json({ users, teachings, events, prayers, leaders, testimonies, ministryTeams, blogPosts, lightCampuses, campusApplications });
    } catch (error) {
        next(new AppError('Failed to fetch dashboard statistics.', 500));
    }
};

import { ObjectId } from 'mongodb';
import { formatUserForClient as formatUser } from '../utils/userFormatter.js';

export const getMyProfile = async (req, res, next) => {
    try {
        const db = getDb();
        const userId = req.user._id;

        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return next(new AppError('User profile not found.', 404));
        }

        res.status(200).json(formatUser(user));
    } catch (error) {
        next(new AppError('Failed to fetch user profile.', 500));
    }
};

export const updateMyProfile = async (req, res, next) => {
    try {
        const db = getDb();
        const userId = req.user._id;
        const { fullName, email, phone, address, avatarUrl } = req.body;

        const updatedFields = {};
        if (fullName) updatedFields.fullName = fullName;
        if (email) updatedFields.email = email;
        if (phone) updatedFields.phone = phone;
        if (address) updatedFields.address = address;
        if (avatarUrl !== undefined) updatedFields.avatarUrl = avatarUrl;

        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $set: updatedFields }
        );

        if (result.matchedCount === 0) {
            return next(new AppError('User profile not found.', 404));
        }

        const updatedUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });

        res.status(200).json({ 
            message: 'Profile updated successfully.', 
            user: formatUser(updatedUser) 
        });
    } catch (error) {
        next(new AppError('Failed to update user profile.', 500));
    }
};
