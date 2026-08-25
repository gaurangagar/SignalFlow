const mongoose = require('mongoose');
const User = require("../models/user.model");
const Follow = require("../models/follow.model");
const Topic = require("../models/topic.model");
const Event = require("../models/event.model");
const Notification = require("../models/notification.model");
const fanoutQueue = require("../queues/fanout.queue");

const triggerEvent = async (req, res) => {
    try {
        const { topicId, type, payload } = req.body;

        if (!topicId || !type || !payload) {
            return res.status(400).json({
                success: false,
                message: "Please provide topicId, type, and payload"
            });
        }

        // Verify that the topic exists
        const topic = await Topic.findOne({ name: topicId });
        if (!topic) {
            return res.status(404).json({
                success: false,
                message: `Topic '${topicId}' does not exist. Please create it first.`
            });
        }

        // 1. Create the event record in the database
        const event = await Event.create({
            topicId,
            type,
            payload
        });

        // 2. Queue the fanout task in BullMQ
        await fanoutQueue.add("fanout-event", {
            eventId: event._id,
            topicId,
            type,
            payload
        });

        console.log(`📢 Event '${type}' triggered for topic '${topicId}' (ID: ${event._id})`);

        res.status(201).json({
            success: true,
            message: "Event triggered successfully, queued for fanout",
            event
        });
    } catch (error) {
        console.error("TriggerEvent Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error triggering event",
            error: error.message
        });
    }
}

const getNotifications = async (req, res) => {
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

        // Fetch notifications sorted by newest first
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(100);

        res.status(200).json({
            success: true,
            count: notifications.length,
            notifications
        });
    } catch (error) {
        console.error("GetNotifications Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error retrieving notifications",
            error: error.message
        });
    }
}

const followTopic = async (req, res) => {
    try {
        const { userId, topicId } = req.params;
        const { channels } = req.body;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Find the topic by name or ID
        const query = { $or: [{ name: topicId }] };
        if (mongoose.isValidObjectId(topicId)) {
            query.$or.push({ _id: topicId });
        }
        const topic = await Topic.findOne(query);
        if (!topic) {
            return res.status(404).json({
                success: false,
                message: "Topic not found"
            });
        }

        const targetTopicId = topic.name;

        // Find or create subscription
        let follow = await Follow.findOne({ userId, topicId: targetTopicId });
        if (follow) {
            if (channels) {
                follow.channels = channels;
                await follow.save();
            }
        } else {
            follow = await Follow.create({
                userId,
                topicId: targetTopicId,
                channels: channels || ["inApp"]
            });
        }

        res.status(200).json({
            success: true,
            message: `Successfully followed topic '${targetTopicId}'`,
            follow
        });
    } catch (error) {
        console.error("FollowTopic Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error subscribing to topic",
            error: error.message
        });
    }
}

const unfollowTopic = async (req, res) => {
    try {
        const { userId, topicId } = req.params;

        // Find the topic by name or ID
        const query = { $or: [{ name: topicId }] };
        if (mongoose.isValidObjectId(topicId)) {
            query.$or.push({ _id: topicId });
        }
        const topic = await Topic.findOne(query);

        const targetTopicId = topic ? topic.name : topicId;

        const result = await Follow.deleteOne({ userId, topicId: targetTopicId });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Subscription not found"
            });
        }

        res.status(200).json({
            success: true,
            message: `Successfully unfollowed topic '${targetTopicId}'`
        });
    } catch (error) {
        console.error("UnfollowTopic Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error unsubscribing from topic",
            error: error.message
        });
    }
}

const createTopic = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Topic name is required"
            });
        }

        const existingTopic = await Topic.findOne({ name: name.trim() });
        if (existingTopic) {
            return res.status(400).json({
                success: false,
                message: "Topic already exists"
            });
        }

        const topic = await Topic.create({
            name: name.trim()
        });

        res.status(201).json({
            success: true,
            message: "Topic created successfully",
            topic
        });
    } catch (error) {
        console.error("CreateTopic Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error creating topic",
            error: error.message
        });
    }
}

const clearNotifications = async (req, res) => {
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

        // Delete all notifications for the user
        await Notification.deleteMany({ userId });

        res.status(200).json({
            success: true,
            message: "Notifications cleared successfully"
        });
    } catch (error) {
        console.error("ClearNotifications Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error clearing notifications",
            error: error.message
        });
    }
}

module.exports = {
    triggerEvent,
    getNotifications,
    followTopic,
    unfollowTopic,
    createTopic,
    clearNotifications
}