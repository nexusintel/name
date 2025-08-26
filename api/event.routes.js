
import express from 'express';
import { getAllEvents, createEvent, updateEvent, deleteEvent } from '../controllers/event.controller.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';
import validate from '../middleware/validation/validate.js';
import { eventSchema } from '../middleware/validation/schemas/event.schema.js';

const router = express.Router();

router.route('/')
    .get(getAllEvents)
    .post(authMiddleware, adminOnly, validate(eventSchema), createEvent);

router.route('/:id')
    .put(authMiddleware, adminOnly, validate(eventSchema), updateEvent)
    .delete(authMiddleware, adminOnly, deleteEvent);

export default router;