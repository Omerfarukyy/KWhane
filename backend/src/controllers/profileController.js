import User from '../models/User.js';
import Profile from '../models/Profile.js';
import { body, validationResult } from 'express-validator';
import { sendVerificationEmail } from '../utils/emailService.js';

// --- Validation rules ---

export const createProfileValidation = [
    body('bio')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Bio cannot exceed 500 characters'),
    body('avatar').optional().trim().isURL().withMessage('Avatar must be a valid URL'),
    body('location')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Location cannot exceed 100 characters'),
    body('website').optional().trim().isURL().withMessage('Website must be a valid URL'),
];

export const updateProfileValidation = [
    body('bio')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Bio cannot exceed 500 characters'),
    body('avatar').optional().trim().isURL().withMessage('Avatar must be a valid URL'),
    body('location')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Location cannot exceed 100 characters'),
    body('website').optional().trim().isURL().withMessage('Website must be a valid URL'),
    body('fullName')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Full name cannot be empty')
        .isLength({ max: 50 })
        .withMessage('Name cannot exceed 50 characters'),
];

export const verifyEmailValidation = [
    body('code')
        .trim()
        .notEmpty()
        .withMessage('Verification code is required')
        .isLength({ min: 6, max: 6 })
        .withMessage('Verification code must be 6 digits'),
];

// --- Controllers ---

// @desc    Create profile for authenticated user
// @route   POST /api/profile
// @access  Private
export const createProfile = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array().map((err) => err.msg),
            });
        }

        // Check if profile already exists
        const existingProfile = await Profile.findOne({ user: req.user._id });
        if (existingProfile) {
            return res.status(400).json({
                success: false,
                message: 'Profile already exists. Use PUT /api/profile to update.',
            });
        }

        const { bio, avatar, location, website } = req.body;

        const profile = await Profile.create({
            user: req.user._id,
            bio: bio || '',
            avatar: avatar || '',
            location: location || '',
            website: website || '',
        });

        res.status(201).json({
            success: true,
            message: 'Profile created successfully',
            profile,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current user's profile
// @route   GET /api/profile/me
// @access  Private
export const getMyProfile = async (req, res, next) => {
    try {
        const profile = await Profile.findOne({ user: req.user._id }).populate(
            'user',
            'fullName email isEmailVerified createdAt'
        );

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found. Create one with POST /api/profile.',
            });
        }

        res.status(200).json({
            success: true,
            profile,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get profile by user ID (public)
// @route   GET /api/profile/user/:userId
// @access  Private
export const getProfileByUserId = async (req, res, next) => {
    try {
        const profile = await Profile.findOne({ user: req.params.userId }).populate(
            'user',
            'fullName email createdAt'
        );

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found',
            });
        }

        res.status(200).json({
            success: true,
            profile,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update profile (requires verified email)
// @route   PUT /api/profile
// @access  Private + Verified
export const updateProfile = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array().map((err) => err.msg),
            });
        }

        const profile = await Profile.findOne({ user: req.user._id });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found. Create one first with POST /api/profile.',
            });
        }

        const { bio, avatar, location, website, fullName } = req.body;

        // Update profile fields
        if (bio !== undefined) profile.bio = bio;
        if (avatar !== undefined) profile.avatar = avatar;
        if (location !== undefined) profile.location = location;
        if (website !== undefined) profile.website = website;

        await profile.save();

        // Update user fullName if provided
        if (fullName) {
            const user = await User.findById(req.user._id);
            user.fullName = fullName;
            await user.save();
        }

        // Return the updated profile with populated user
        const updatedProfile = await Profile.findOne({ user: req.user._id }).populate(
            'user',
            'fullName email isEmailVerified createdAt'
        );

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            profile: updatedProfile,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete user account and profile (requires verified email)
// @route   DELETE /api/profile
// @access  Private + Verified
export const deleteAccount = async (req, res, next) => {
    try {
        // Delete the profile
        await Profile.findOneAndDelete({ user: req.user._id });

        // Delete the user
        await User.findByIdAndDelete(req.user._id);

        res.status(200).json({
            success: true,
            message: 'Account and profile deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Send email verification code
// @route   POST /api/profile/verify/send
// @access  Private
export const sendVerificationCode = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select(
            '+emailVerificationCode +emailVerificationExpires'
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email is already verified',
            });
        }

        // Generate and save the code
        const code = user.generateEmailVerificationCode();
        await user.save({ validateBeforeSave: false });

        // Send the email
        const emailSent = await sendVerificationEmail(user.email, code);

        // In development, include the code in the response for easy testing
        const response = {
            success: true,
            message: emailSent
                ? 'Verification code sent to your email'
                : 'Verification code generated (email delivery failed — check server logs)',
        };

        if (process.env.NODE_ENV === 'development') {
            response.verificationCode = code;
        }

        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

// @desc    Confirm email verification code
// @route   POST /api/profile/verify/confirm
// @access  Private
export const verifyEmail = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array().map((err) => err.msg),
            });
        }

        const { code } = req.body;

        const user = await User.findById(req.user._id).select(
            '+emailVerificationCode +emailVerificationExpires'
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email is already verified',
            });
        }

        // Check code
        if (!user.emailVerificationCode || user.emailVerificationCode !== code) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification code',
            });
        }

        // Check expiry
        if (!user.emailVerificationExpires || user.emailVerificationExpires < Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'Verification code has expired. Please request a new one.',
            });
        }

        // Mark as verified and clear the code fields
        user.isEmailVerified = true;
        user.emailVerificationCode = undefined;
        user.emailVerificationExpires = undefined;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: 'Email verified successfully',
        });
    } catch (error) {
        next(error);
    }
};
