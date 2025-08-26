import express from 'express';
import { createNewConvert, getAllNewConverts } from '../controllers/newConverts.controller.js';

const router = express.Router();

router.post('/', createNewConvert);
router.get('/', getAllNewConverts);

export default router;