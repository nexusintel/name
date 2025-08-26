import { getDb } from '../db/index.js';
import AppError from '../utils/AppError.js';

export const getContent = async (req, res, next) => {
    try {
        const { page } = req.query;
        if (!page || typeof page !== 'string' || !['home', 'give', 'contact'].includes(page)) {
            return next(new AppError('A valid page query parameter (home, give, contact) is required.', 400));
        }
        
        const db = getDb();
        const content = await db.collection('site_content').findOne({ page: page });
        
        if (!content) {
            return res.status(200).json({ page, elements: {} });
        }
        
        res.status(200).json(content);
    } catch (error) {
        next(new AppError('Failed to fetch site content.', 500));
    }
};

export const updateContent = async (req, res, next) => {
    try {
        const { page, elements } = req.body;
        if (!page || !elements) return next(new AppError('Page and elements are required', 400));

        const db = getDb();
        await db.collection('site_content').updateOne(
            { page: page },
            { $set: { page, elements } },
            { upsert: true }
        );

        res.status(200).json({ message: 'Content updated successfully' });
    } catch (error) {
        next(new AppError('Failed to update site content.', 500));
    }
};
