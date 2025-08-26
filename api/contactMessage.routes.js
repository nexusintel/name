
import express from 'express';
import { createContactMessage } from '../controllers/contactMessage.controller.js';

const router = express.Router();

// This endpoint is public for users to submit the contact form
router.post('/', createContactMessage);

export default router;
