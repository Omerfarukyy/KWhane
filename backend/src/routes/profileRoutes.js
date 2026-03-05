import express from 'express';
import {
    createProfile,
    getMyProfile,
    getProfileByUserId,
    updateProfile,
    deleteAccount,
    sendVerificationCode,
    verifyEmail,
    createProfileValidation,
    updateProfileValidation,
    verifyEmailValidation,
} from '../controllers/profileController.js';
import { authenticate } from '../middleware/auth.js';
import { requireVerifiedEmail } from '../middleware/requireVerifiedEmail.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// --- Email Verification ---

// @route   POST /api/profile/verify/send
// @desc    Send verification code to user's email
// @access  Private
router.post('/verify/send', sendVerificationCode);

// @route   POST /api/profile/verify/confirm
// @desc    Confirm the 6-digit verification code
// @access  Private
router.post('/verify/confirm', verifyEmailValidation, verifyEmail);

// --- Profile CRUD ---

// @route   POST /api/profile
// @desc    Create profile for the authenticated user
// @access  Private
router.post('/', createProfileValidation, createProfile);

// @route   GET /api/profile/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', getMyProfile);

// @route   GET /api/profile/user/:userId
// @desc    Get profile by user ID
// @access  Private
router.get('/user/:userId', getProfileByUserId);

// @route   PUT /api/profile
// @desc    Update profile (requires verified email)
// @access  Private + Verified Email
router.put('/', requireVerifiedEmail, updateProfileValidation, updateProfile);

// @route   DELETE /api/profile
// @desc    Delete user account and profile (requires verified email)
// @access  Private + Verified Email
router.delete('/', requireVerifiedEmail, deleteAccount);

export default router;
