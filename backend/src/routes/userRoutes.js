import express from 'express';
import {
    getProfile,
    updateProfile,
    deleteUser,
    getAllUsers,
    updateProfileValidation,
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', getProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', updateProfileValidation, updateProfile);

// @route   DELETE /api/users/:id
// @desc    Delete user account
// @access  Private
router.delete('/:id', deleteUser);

// @route   GET /api/users
// @desc    Get all users (Admin only - for future use)
// @access  Private/Admin
router.get('/', getAllUsers);

export default router;
