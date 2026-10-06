/**
 * Middleware to check if the authenticated user is the owner of the resource
 * identified by req.params.userId (or 'me' alias).
 */
const checkOwnership = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Not authorized, token required",
            });
        }

        let { userId } = req.params;

        // Support 'me' alias
        if (userId === "me") {
            req.params.userId = req.user._id.toString();
            userId = req.params.userId;
        }

        if (userId && req.user._id.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You do not have permission to access or modify this resource",
            });
        }

        next();
    } catch (error) {
        console.error("Ownership Middleware Error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error verifying resource ownership",
            error: error.message,
        });
    }
};

module.exports = checkOwnership;
