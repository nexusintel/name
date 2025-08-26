import { getDb } from '../db/index.js';
import { ObjectId } from 'mongodb';
import AppError from '../utils/AppError.js';

export const getAllEvents = async (req, res, next) => {
    try {
        const db = getDb();
        const limit = req.query.limit ? parseInt(req.query.limit) : 0;
        const upcoming = req.query.upcoming === 'true';
        
        let query = {};
        let sort = { event_date: -1 };
        
        // Filter for upcoming events if requested
        if (upcoming) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of today
            query = { event_date: { $gte: today.toISOString().split('T')[0] } };
            sort = { event_date: 1 }; // Sort upcoming events by date ascending
        }
        
        const dbEvents = await db.collection('events')
            .find(query)
            .sort(sort)
            .limit(limit)
            .toArray();
            
        const events = dbEvents.map((e) => ({...e, _id: e._id.toHexString()}));
        res.status(200).json(events);
    } catch (error) {
        console.error('Error fetching events:', error);
        next(new AppError('Failed to fetch events.', 500));
    }
};

export const createEvent = async (req, res, next) => {
    try {
        const db = getDb();
        const newEventData = { ...req.body, created_at: new Date().toISOString() };
        const result = await db.collection('events').insertOne(newEventData);
        res.status(201).json({ ...newEventData, _id: result.insertedId.toHexString() });
    } catch (error) {
        next(new AppError('Failed to create event.', 500));
    }
};

export const updateEvent = async (req, res, next) => {
    try {
        const db = getDb();
        const { id } = req.params;
        const { _id, ...updateData } = req.body;
        const result = await db.collection('events').updateOne({ _id: new ObjectId(id) }, { $set: updateData });
        if(result.matchedCount === 0) return next(new AppError('Event not found', 404));
        res.status(200).json({ message: 'Event updated successfully' });
    } catch (error) {
        next(new AppError('Failed to update event.', 500));
    }
};

export const deleteEvent = async (req, res, next) => {
    try {
        const db = getDb();
        const { id } = req.params;
        const result = await db.collection('events').deleteOne({ _id: new ObjectId(id) });
        if(result.deletedCount === 0) return next(new AppError('Event not found', 404));
        res.status(204).send();
    } catch (error) {
        next(new AppError('Failed to delete event.', 500));
    }
};