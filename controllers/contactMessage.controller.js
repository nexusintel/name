import { getDb } from '../db/index.js';
import AppError from '../utils/AppError.js';

export const createContactMessage = async (req, res, next) => {
    try {
        const db = getDb();
        const { name, email, subject, message } = req.body;
        if(!name || !email || !subject || !message) {
            return next(new AppError('All fields are required.', 400));
        }

        const newContactMessage = {
            name,
            email,
            subject,
            message,
            created_at: new Date().toISOString(),
        };

        await db.collection('contact_messages').insertOne(newContactMessage);
        res.status(201).json({ message: 'Message sent successfully.' });
    } catch (error) {
        next(new AppError('Failed to send message.', 500));
    }
};