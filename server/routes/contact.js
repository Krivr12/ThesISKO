import express from 'express';
import { submitContactForm } from '../controller/contactController.js';

const router = express.Router();

// POST /contact - Submit contact form
router.post('/', submitContactForm);

export default router;

