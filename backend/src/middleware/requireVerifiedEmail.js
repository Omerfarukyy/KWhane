// Middleware to ensure the authenticated user has a verified email
export const requireVerifiedEmail = (req, res, next) => {
    if (!req.user || !req.user.isEmailVerified) {
        return res.status(403).json({
            success: false,
            message: 'Email verification required. Please verify your email before performing this action.',
        });
    }
    next();
};
