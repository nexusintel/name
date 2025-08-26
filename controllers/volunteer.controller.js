import { getDb } from '../db/index.js';
import { ObjectId } from 'mongodb';
import AppError from '../utils/AppError.js';

export const createApplication = async (req, res, next) => {
    try {
        const { teamId, message } = req.body;
        const user = req.user;

        if (!teamId || !message) {
            return next(new AppError('Team ID and message are required.', 400));
        }

        const db = getDb();
        
        const team = await db.collection('ministry_teams').findOne({ _id: new ObjectId(teamId) });
        if (!team) {
            return next(new AppError('Ministry team not found.', 404));
        }

        const newApplication = {
            userId: user._id.toHexString(),
            userName: user.fullName || user.email,
            userEmail: user.email,
            teamId: team._id.toHexString(),
            teamName: team.name,
            message: message,
            status: 'Pending',
            createdAt: new Date().toISOString()
        };

        await db.collection('volunteer_applications').insertOne(newApplication);
        res.status(201).json({ message: 'Application submitted successfully.' });

    } catch (error) {
        next(new AppError('Failed to submit application.', 500));
    }
};
export const getAllApplications = async (req, res, next) => {
    try {
        const db = getDb();
        const applications = await db.collection('volunteer_applications')
            .find({})
            .sort({ createdAt: -1 })
            .toArray();
        res.status(200).json(applications);
    } catch (error) {
        next(new AppError('Failed to fetch volunteer applications.', 500));
    }
};

export const updateApplicationStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!ObjectId.isValid(id)) {
            return next(new AppError('Invalid application ID.', 400));
        }

        if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
            return next(new AppError('Invalid status.', 400));
        }

        const db = getDb();
        const result = await db.collection('volunteer_applications').updateOne(
            { _id: new ObjectId(id) },
            { $set: { status } }
        );

        if (result.matchedCount === 0) {
            return next(new AppError('Application not found.', 404));
        }

        res.status(200).json({ message: 'Application status updated successfully.' });
    } catch (error) {
        next(new AppError('Failed to update application status.', 500));
    }
};