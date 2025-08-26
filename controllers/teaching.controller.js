import { getDb } from '../db/index.js';
import { ObjectId } from 'mongodb';
import AppError from '../utils/AppError.js';

export const getAllTeachings = async (req, res, next) => {
    try {
        const db = getDb();
        const limit = req.query.limit ? parseInt(req.query.limit) : 0;
        const dbTeachings = await db.collection('teachings')
            .find({})
            .sort({ preached_at: -1 })
            .limit(limit)
            .toArray();
        
        const teachings = dbTeachings.map((t) => ({...t, _id: t._id.toHexString()}));
            
        res.status(200).json(teachings);
    } catch (error) {
        next(new AppError('Failed to fetch teachings.', 500));
    }
};

export const createTeaching = async (req, res, next) => {
    try {
        const db = getDb();
        const newTeachingData = { ...req.body, created_at: new Date().toISOString() };
        const result = await db.collection('teachings').insertOne(newTeachingData);
        res.status(201).json({ ...newTeachingData, _id: result.insertedId.toHexString() });
    } catch (error) {
        next(new AppError('Failed to create teaching.', 500));
    }
};

export const updateTeaching = async (req, res, next) => {
    try {
        const db = getDb();
        const { id } = req.params;
        const { _id, ...updateData } = req.body;
        const result = await db.collection('teachings').updateOne({ _id: new ObjectId(id) }, { $set: updateData });
        if(result.matchedCount === 0) return next(new AppError('Teaching not found', 404));
        res.status(200).json({ message: 'Teaching updated successfully' });
    } catch (error) {
        next(new AppError('Failed to update teaching.', 500));
    }
};

export const deleteTeaching = async (req, res, next) => {
    try {
        const db = getDb();
        const { id } = req.params;
        const result = await db.collection('teachings').deleteOne({ _id: new ObjectId(id) });
        if(result.deletedCount === 0) return next(new AppError('Teaching not found', 404));
        res.status(204).send();
    } catch (error) {
        next(new AppError('Failed to delete teaching.', 500));
    }
};