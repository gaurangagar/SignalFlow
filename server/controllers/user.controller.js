const User = require('../models/user.model');
const Follow = require('../models/follow.model');

const getSubscriptions = async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Get all follows for this user
        const subscriptions = await Follow.find({ userId });

        res.status(200).json({
            success: true,
            count: subscriptions.length,
            subscriptions
        });
    } catch (error) {
        console.error("GetSubscriptions Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error retrieving subscriptions",
            error: error.message
        });
    }
}

const getUsers = async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        console.error("GetUsers Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error retrieving users",
            error: error.message
        });
    }
}

const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error("GetUserById Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error retrieving user",
            error: error.message
        });
    }
}

const toggleWatchlist = async (req, res) => {
    try {
        const { userId } = req.params;
        const { topicId } = req.body;

        if (!topicId) {
            return res.status(400).json({
                success: false,
                message: "Please provide a topicId"
            });
        }

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Find if user is already following this topic
        const follow = await Follow.findOne({ userId, topicId });

        if (follow) {
            // If already following, remove it (unfollow / remove from watchlist)
            await Follow.deleteOne({ _id: follow._id });
            return res.status(200).json({
                success: true,
                message: `Successfully unfollowed topic ${topicId}`,
                isFollowing: false
            });
        } else {
            // If not following, create a new follow with default inApp channel
            const newFollow = await Follow.create({
                userId,
                topicId,
                channels: ["inApp"] // default channel
            });
            return res.status(201).json({
                success: true,
                message: `Successfully followed topic ${topicId}`,
                isFollowing: true,
                follow: newFollow
            });
        }
    } catch (error) {
        console.error("ToggleWatchlist Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error toggling watchlist",
            error: error.message
        });
    }
}

const armAll = async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Enable all notification channels ("email" and "inApp") for all user subscriptions
        const result = await Follow.updateMany(
            { userId },
            { $set: { channels: ["email", "inApp"] } }
        );

        res.status(200).json({
            success: true,
            message: `Successfully armed all notification channels for ${result.modifiedCount} subscription(s)`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error("ArmAll Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error arming channels",
            error: error.message
        });
    }
}

module.exports = {
    getSubscriptions,
    getUsers,
    getUserById,
    toggleWatchlist,
    armAll
}