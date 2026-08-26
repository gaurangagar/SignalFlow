const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../config/resend');

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide name, email and password"
            });
        }

        // Check if user already exists
        const userExists = await User.findOne({ email: email.toLowerCase() });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: "User already exists"
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword
        });

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || "default_jwt_secret_key_change_me",
            { expiresIn: '30d' }
        );

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during registration",
            error: error.message
        });
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password"
            });
        }

        // Find user & include password field
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Check if password exists (e.g. if registered through OAuth it might be empty)
        if (!user.password) {
            return res.status(400).json({
                success: false,
                message: "This account does not have a password set. Try logging in via OAuth."
            });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || "default_jwt_secret_key_change_me",
            { expiresIn: '30d' }
        );

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during login",
            error: error.message
        });
    }
}

const getMe = async (req, res) => {
    try {
        let token;

        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authorized, token required"
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret_key_change_me");

        // Get user from DB
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error("GetMe Error:", error);
        res.status(401).json({
            success: false,
            message: "Not authorized, invalid token",
            error: error.message
        });
    }
}

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Please provide an email address"
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "There is no user with that email address"
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash token and set expire
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes from now

        await user.save();

        // Create reset URL
        const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password?token=${resetToken}`;

        // Send email (or log to console in dev mode if RESEND_API_KEY is not configured)
        if (!process.env.RESEND_API_KEY) {
            console.log("\n====== DEVELOPMENT MODE PASSWORD RESET ======");
            console.log(`User Email: ${email}`);
            console.log(`Reset Token: ${resetToken}`);
            console.log(`Reset URL: ${resetUrl}`);
            console.log("=============================================\n");

            return res.status(200).json({
                success: true,
                message: "Reset link generated. In development (no RESEND_API_KEY configured), check server console for the token.",
                token: resetToken
            });
        }

        const textContent = `You are receiving this email because you (or someone else) have requested the reset of a password. Please click on the following link, or paste this into your browser to complete the process within 10 minutes:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;

        try {
            await sendEmail(user.email, 'SignalFlow Password Reset Request', null, textContent);
            res.status(200).json({
                success: true,
                message: "Email sent successfully"
            });
        } catch (mailError) {
            console.error("Resend Error:", mailError);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();

            return res.status(500).json({
                success: false,
                message: "Email could not be sent",
                error: mailError.message
            });
        }

    } catch (error) {
        console.error("ForgotPassword Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during forgot password processing",
            error: error.message
        });
    }
}

const resetPassword = async (req, res) => {
    try {
        const token = req.query.token || req.body.token;
        const { password } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Token is required"
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                message: "Password is required"
            });
        }

        // Hash token to compare with DB
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with matching token and unexpired timer
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }
        }).select('+password +resetPasswordToken +resetPasswordExpire');

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset token"
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Clear reset fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        // Generate new JWT token
        const jwtToken = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || "default_jwt_secret_key_change_me",
            { expiresIn: '30d' }
        );

        res.status(200).json({
            success: true,
            token: jwtToken,
            message: "Password reset successful"
        });

    } catch (error) {
        console.error("ResetPassword Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during password reset",
            error: error.message
        });
    }
}

module.exports = {
    register,
    login,
    getMe,
    forgotPassword,
    resetPassword
}