import { getDb } from '../db/index.js';
import { ObjectId } from 'mongodb';
import AppError from '../utils/AppError.js';

const formatCampusForClient = (campus) => {
    if (!campus) return null;
    return { ...campus, _id: campus._id.toHexString() };
};

export const getPublicCampuses = async (req, res, next) => {
    try {
        const db = getDb();
        const campuses = await db.collection('light_campuses').find({ isActive: true }).sort({ name: 1 }).toArray();
        res.status(200).json(campuses.map(formatCampusForClient));
    } catch (error) {
        next(new AppError('Failed to fetch light campuses.', 500));
    }
};
export const applyForCampus = async (req, res, next) => {
    try {
        const db = getDb();
        const { proposedCampusName, proposedLocation, missionStatement, proposedLeaderName, contactInfo } = req.body;
        const user = req.user;

        if (!proposedCampusName || !proposedLocation || !missionStatement) {
            return next(new AppError('Campus name, location, and mission statement are required.', 400));
        }

        const newApplication = {
            name: proposedCampusName,
            location: proposedLocation,
            description: missionStatement,
            proposedLeaderName,
            contactInfo,
            userId: user._id.toHexString(),
            applicantName: user.fullName,
            applicantEmail: user.email,
            avatarUrl: user.avatarUrl,
            status: 'Pending',
            createdAt: new Date().toISOString(),
        };

        await db.collection('light_campus_applications').insertOne(newApplication);
        res.status(201).json({ message: 'Application submitted successfully.' });
    } catch (error) {
        next(new AppError('Failed to submit application.', 500));
    }
};

export const getAllCampusesAdmin = async (req, res, next) => {
    try {
        const db = getDb();
        const campuses = await db.collection('light_campuses').find({}).sort({ name: 1 }).toArray();
        res.status(200).json(campuses.map(formatCampusForClient));
    } catch (error) {
        next(new AppError('Failed to fetch all light campuses.', 500));
    }
};

export const createCampusAdmin = async (req, res, next) => {
    try {
        const db = getDb();
        const { name, location, leaderName, contactInfo, meetingSchedule, isActive, imageUrl, images } = req.body;

        if (!name || !location || !leaderName) {
            return next(new AppError('Name, location, and leader name are required.', 400));
        }

        const newCampus = {
            name,
            location,
            leaderName,
            contactInfo,
            meetingSchedule,
            isActive: isActive !== false,
            imageUrl,
            images: images || [], // Array of image objects with url, publicId, etc.
            createdAt: new Date().toISOString(),
        };

        const result = await db.collection('light_campuses').insertOne(newCampus);
        const createdCampus = { ...newCampus, _id: result.insertedId };
        
        res.status(201).json(formatCampusForClient(createdCampus));
    } catch (error) {
        next(new AppError('Failed to create light campus.', 500));
    }
};

export const updateCampusAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, location, description, isActive, imageUrl, images } = req.body;

        if (!ObjectId.isValid(id)) {
            return next(new AppError('Invalid campus ID.', 400));
        }

        const db = getDb();
        const updatedFields = { name, location, description, isActive, imageUrl };
        
        // Only update images if provided
        if (images !== undefined) {
            updatedFields.images = images;
        }

        const result = await db.collection('light_campuses').updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedFields }
        );

        if (result.matchedCount === 0) {
            return next(new AppError('Light campus not found.', 404));
        }

        const updatedCampus = await db.collection('light_campuses').findOne({ _id: new ObjectId(id) });
        res.status(200).json(formatCampusForClient(updatedCampus));
    } catch (error) {
        next(new AppError('Failed to update light campus.', 500));
    }
};

export const deleteCampusAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return next(new AppError('Invalid campus ID.', 400));
        }

        const db = getDb();
        const result = await db.collection('light_campuses').deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return next(new AppError('Light campus not found.', 404));
        }

        res.status(200).json({ message: 'Light campus deleted successfully.' });
    } catch (error) {
        next(new AppError('Failed to delete light campus.', 500));
    }
};

export const getAllApplicationsAdmin = async (req, res, next) => {
    try {
        const db = getDb();
        const applications = await db.collection('light_campus_applications')
            .find({})
            .sort({ createdAt: -1 })
            .toArray();
        res.status(200).json(applications.map(formatCampusForClient));
    } catch (error) {
        next(new AppError('Failed to fetch light campus applications.', 500));
    }
};

export const approveApplicationAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return next(new AppError('Invalid application ID.', 400));
        }

        const db = getDb();
        const application = await db.collection('light_campus_applications').findOne({ _id: new ObjectId(id) });

        if (!application) {
            return next(new AppError('Application not found.', 404));
        }

        const newCampus = {
            name: application.name,
            location: application.location,
            description: application.description,
            isActive: true,
            createdAt: new Date().toISOString(),
        };

        await db.collection('light_campuses').insertOne(newCampus);
        await db.collection('light_campus_applications').updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: 'Approved' } }
        );

        res.status(200).json({ message: 'Application approved and campus created.' });
    } catch (error) {
        next(new AppError('Failed to approve application.', 500));
    }
};

export const rejectApplicationAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return next(new AppError('Invalid application ID.', 400));
        }

        const db = getDb();
        const result = await db.collection('light_campus_applications').updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: 'Rejected' } }
        );

        if (result.matchedCount === 0) {
            return next(new AppError('Application not found.', 404));
        }

        res.status(200).json({ message: 'Application rejected.' });
    } catch (error) {
        next(new AppError('Failed to reject application.', 500));
    }
};

// Add images to a campus
export const addCampusImages = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { images } = req.body; // Array of {url, publicId, alt, caption}

        if (!ObjectId.isValid(id)) {
            return next(new AppError('Invalid campus ID.', 400));
        }

        if (!images || !Array.isArray(images)) {
            return next(new AppError('Images array is required.', 400));
        }

        const db = getDb();
        
        // Add timestamps to images
        const timestampedImages = images.map(img => ({
            ...img,
            uploadedAt: new Date().toISOString(),
            uploadedBy: req.user?._id?.toHexString() || 'system'
        }));

        const result = await db.collection('light_campuses').updateOne(
            { _id: new ObjectId(id) },
            { $push: { images: { $each: timestampedImages } } }
        );

        if (result.matchedCount === 0) {
            return next(new AppError('Light campus not found.', 404));
        }

        const updatedCampus = await db.collection('light_campuses').findOne({ _id: new ObjectId(id) });
        res.status(200).json(formatCampusForClient(updatedCampus));
    } catch (error) {
        next(new AppError('Failed to add images to campus.', 500));
    }
};

// Remove an image from a campus
export const removeCampusImage = async (req, res, next) => {
    try {
        const { id, imageId } = req.params;

        if (!ObjectId.isValid(id)) {
            return next(new AppError('Invalid campus ID.', 400));
        }

        const db = getDb();
        
        const result = await db.collection('light_campuses').updateOne(
            { _id: new ObjectId(id) },
            { $pull: { images: { publicId: imageId } } }
        );

        if (result.matchedCount === 0) {
            return next(new AppError('Light campus not found.', 404));
        }

        const updatedCampus = await db.collection('light_campuses').findOne({ _id: new ObjectId(id) });
        res.status(200).json(formatCampusForClient(updatedCampus));
    } catch (error) {
        next(new AppError('Failed to remove image from campus.', 500));
    }
};