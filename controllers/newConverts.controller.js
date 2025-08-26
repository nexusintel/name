import { getDb } from '../db/index.js';
import AppError from '../utils/AppError.js';

export const createNewConvert = async (req, res, next) => {
    try {
        const db = getDb();
        const newConvert = {
            ...req.body,
            createdAt: new Date().toISOString(),
        };
        await db.collection('new_converts').insertOne(newConvert);
        res.status(201).json({ message: 'New convert created successfully.' });
    } catch (error) {
        next(new AppError('Failed to create new convert.', 500));
    }
};
export const getAllNewConverts = async (req, res, next) => {
    try {
        const db = getDb();
        const newConverts = await db.collection('new_converts').find({}).sort({ createdAt: -1 }).toArray();
        res.status(200).json(newConverts);
    } catch (error) {
        next(new AppError('Failed to fetch new converts.', 500));
    }
};