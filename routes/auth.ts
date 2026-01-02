import express, { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  verifyOTP,
  verifyEmail,
  resendVerification,
  googleSignIn,
  googleOAuthInitiate,
  googleOAuthCallback,
} from '../controllers/authController';
import { protect } from '../middleware/auth';

const router: Router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

// Google OAuth routes
router.post('/google-signin', googleSignIn); // Mobile native
router.get('/google', googleOAuthInitiate); // Web OAuth initiate
router.get('/callback/google', googleOAuthCallback); // Web OAuth callback - matches Google Console URI

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

export default router;
