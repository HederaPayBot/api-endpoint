import { Router } from 'express';
import {  getElizaStatus } from '../controllers/elizaController';

const router = Router();


// Check Eliza status
router.get('/status', getElizaStatus);

export default router; 