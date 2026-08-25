const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const protect = async (req, res, next) => {
    try {
        let token;

        // Check Authorization header
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer ")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        // No token
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authorized, token required",
            });
        }

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "default_jwt_secret_key_change_me"
        );

        // Find user
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Not authorized, user not found",
            });
        }

        // Attach user to request
        req.user = user;

        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error.message);

        return res.status(401).json({
            success: false,
            message: "Not authorized, invalid or expired token",
        });
    }
};

module.exports = protect;