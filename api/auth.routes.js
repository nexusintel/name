
import express from 'express';
import rateLimit from 'express-rate-limit';
import { login, register } from '../controllers/auth.controller.js';
import validate from '../middleware/validation/validate.js';
import { registerSchema, loginSchema } from '../middleware/validation/schemas/auth.schema.js';

const router = express.Router();

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10, // Limit each IP to 10 login/register requests per window
	standardHeaders: true,
	legacyHeaders: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes'
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);

export default router;