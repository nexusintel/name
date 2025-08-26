
import express from 'express';
import { getAllTeachings, createTeaching, updateTeaching, deleteTeaching } from '../controllers/teaching.controller.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';
import validate from '../middleware/validation/validate.js';
import { teachingSchema } from '../middleware/validation/schemas/teaching.schema.js';

const router = express.Router();

router.route('/')
    .get(getAllTeachings)
    .post(authMiddleware, adminOnly, validate(teachingSchema), createTeaching);

router.route('/:id')
    .put(authMiddleware, adminOnly, validate(teachingSchema), updateTeaching)
    .delete(authMiddleware, adminOnly, deleteTeaching);

export default router;