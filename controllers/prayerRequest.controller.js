import { getDb } from '../db/index.js';
import { ObjectId } from 'mongodb';
import AppError from '../utils/AppError.js';

// Helper function to populate avatar URLs for prayer requests
const populateAvatars = async (requests, db) => {
    // Get unique user IDs from requests that have user_id
    const userIds = [...new Set(
        requests
            .filter(req => req.user_id)
            .map(req => req.user_id)
    )];

    if (userIds.length === 0) {
        return requests;
    }

    // Fetch users with those IDs
    const users = await db.collection('users')
        .find({ 
            _id: { $in: userIds.map(id => new ObjectId(id)) }
        })
        .project({ _id: 1, avatarUrl: 1 })
        .toArray();

    // Create a map of user ID to avatar URL
    const avatarMap = new Map();
    users.forEach(user => {
        avatarMap.set(user._id.toHexString(), user.avatarUrl);
    });

    // Add avatar URLs to requests
    return requests.map(req => ({
        ...req,
        avatar_url: req.user_id ? avatarMap.get(req.user_id) || null : null
    }));
};

export const getPublicPrayerRequests = async (req, res, next) => {
    try {
        const db = getDb();
        const dbRequests = await db.collection('prayer_requests')
            .find({ is_private: false, is_answered: false })
            .sort({ created_at: -1 })
            .toArray();
        
        let requests = dbRequests.map((r) => ({...r, _id: r._id.toHexString()}));
        
        // Populate avatar URLs
        requests = await populateAvatars(requests, db);
        
        res.status(200).json(requests);
    } catch (error) {
        next(new AppError('Failed to fetch public prayer requests.', 500));
    }
};

export const createPublicPrayerRequest = async (req, res, next) => {
    try {
        const db = getDb();
        const { name, email, request_text, share_publicly } = req.body;
        
        if (!name || !request_text) {
             return next(new AppError('Name and prayer request are required.', 400));
        }

        const newRequest = { 
            name,
            email: email || '',
            request_text,
            is_private: !share_publicly,
            is_answered: false,
            created_at: new Date().toISOString(),
        };
        
        // Add user information if authenticated
        if (req.user) {
            newRequest.user_id = req.user._id.toHexString();
        }
        
        const result = await db.collection('prayer_requests').insertOne(newRequest);
        let createdRequest = {...newRequest, _id: result.insertedId.toHexString()};
        
        // Populate avatar URL if user_id exists
        if (createdRequest.user_id) {
            const enrichedRequests = await populateAvatars([createdRequest], db);
            createdRequest = enrichedRequests[0];
        }
        
        res.status(201).json({ message: "Prayer request submitted successfully.", newRequest: createdRequest});
    } catch (error) {
        next(new AppError('Failed to submit prayer request.', 500));
    }
};
export const getAllPrayerRequests = async (req, res, next) => {
    try {
        const db = getDb();
        const dbRequests = await db.collection('prayer_requests')
            .find({})
            .sort({ created_at: -1 })
            .toArray();
        
        let requests = dbRequests.map((r) => ({...r, _id: r._id.toHexString()}));
        
        // Populate avatar URLs
        requests = await populateAvatars(requests, db);
        
        res.status(200).json(requests);
    } catch (error) {
        next(new AppError('Failed to fetch all prayer requests.', 500));
    }
};

export const updatePrayerRequest = async (req, res, next) => {
    try {
        const db = getDb();
        const { id } = req.params;
        const { is_answered, is_private } = req.body;

        if (!ObjectId.isValid(id)) {
            return next(new AppError('Invalid prayer request ID.', 400));
        }

        // Build update object based on provided fields
        const updateFields = {};
        if (is_answered !== undefined) {
            updateFields.is_answered = is_answered;
        }
        if (is_private !== undefined) {
            updateFields.is_private = is_private;
        }
        
        // Add updated timestamp and admin info if authenticated
        updateFields.updated_at = new Date().toISOString();
        if (req.user) {
            updateFields.updated_by = req.user._id.toHexString();
        }

        const result = await db.collection('prayer_requests').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateFields }
        );

        if (result.matchedCount === 0) {
            return next(new AppError('Prayer request not found.', 404));
        }

        // Return the updated request for frontend state management
        const updatedRequest = await db.collection('prayer_requests').findOne({ _id: new ObjectId(id) });
        const formattedRequest = { ...updatedRequest, _id: updatedRequest._id.toHexString() };

        res.status(200).json({ 
            message: 'Prayer request updated successfully.',
            request: formattedRequest
        });
    } catch (error) {
        next(new AppError('Failed to update prayer request.', 500));
    }
};

export const deletePrayerRequest = async (req, res, next) => {
    try {
        const db = getDb();
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return next(new AppError('Invalid prayer request ID.', 400));
        }

        const result = await db.collection('prayer_requests').deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return next(new AppError('Prayer request not found.', 404));
        }

        res.status(200).json({ message: 'Prayer request deleted successfully.' });
    } catch (error) {
        next(new AppError('Failed to delete prayer request.', 500));
    }
};