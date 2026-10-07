/**
 * Middleware to restrict access to admin-only endpoints.
 * Must be used AFTER the `protect` middleware, which populates req.user.
 */
const adminOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Not authorized, token required",
        });
    }

    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: "Forbidden: Admin access required",
        });
    }

    next();
};

module.exports = adminOnly;
