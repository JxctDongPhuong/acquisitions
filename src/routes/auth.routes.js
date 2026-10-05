import express from 'express';
import {
  signUp,
  signIn,
  signOut,
  getMe,
} from '#controllers/auth.controllers.js';
import { requireAuth } from '#middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/sign-up', signUp);
router.post('/sign-in', signIn);

// Protected routes (requires valid JWT cookie)
router.post('/sign-out', requireAuth, signOut);
router.get('/me', requireAuth, getMe);

export default router;
