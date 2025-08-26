
import Joi from 'joi';

export const eventSchema = Joi.object({
    title: Joi.string().min(3).max(150).required(),
    location: Joi.string().min(3).max(100).required(),
    event_date: Joi.date().iso().required(),
    event_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({'string.pattern.base': `Event time must be in HH:MM format`}),
    description: Joi.string().min(10).required(),
    image_base64: Joi.string().dataUri().allow(null, ''),
    // Optional fields
    max_attendees: Joi.number().integer().min(1).optional(),
    registration_required: Joi.boolean().optional(),
    // Allow created_at and _id for updates
    created_at: Joi.date().iso().optional(),
    _id: Joi.string().optional(),
});
