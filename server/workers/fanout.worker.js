const { Worker } = require("bullmq");
const redisConnection = require("../config/ioredis");
const Follow = require("../models/follow.model");
const User = require("../models/user.model");
const Delivery = require("../models/delivery.model");
const emailQueue = require("../queues/email.queue");
const inAppQueue = require("../queues/inapp.queue");

const fanoutWorker = new Worker(
    'fanout-queue',
    async job => {
        const { eventId, topicId, type, payload } = job.data;
        console.log(`📧 Fanout Worker: Picking up job for topic ID ${topicId}`);

        const followers = await Follow.find({ topicId: String(topicId) });
        console.log(`Found ${followers.length} followers for topic ${topicId}`);

        for (const follower of followers) {
            const doesFollowerExist = await User.exists({ _id: follower.userId });
            if (!doesFollowerExist) {
                console.log(`User ${follower.userId} not found, skipping`);
                await Follow.deleteMany({ userId: follower.userId });
                continue;
            }

            const userIdStr = follower.userId.toString();

            if (follower.channels.includes("email")) {
                if (eventId) {
                    try {
                        // $setOnInsert ensures we never overwrite an existing delivery
                        // record (e.g. one already marked 'success' or 'failed' by a
                        // previous attempt). The upsert is a no-op when the row exists.
                        await Delivery.findOneAndUpdate(
                            { eventId, userId: follower.userId, channel: "email" },
                            { $setOnInsert: { status: "pending", attempts: 0 } },
                            { upsert: true, new: true }
                        );
                    } catch (error) {
                        // Duplicate-key on a race is safe to ignore; the row already exists.
                        if (error.code !== 11000) {
                            console.error("Fanout: email Delivery upsert failed", error.message);
                        }
                    }
                }

                // Deterministic jobId: BullMQ silently discards a duplicate add when a
                // job with the same ID is already queued or processing, making fanout
                // retries safe against double-sending.
                const emailJobId = eventId
                    ? `email:${eventId}:${userIdStr}`
                    : undefined;

                await emailQueue.add(
                    "send-email",
                    { eventId, userId: follower.userId, type, payload },
                    { jobId: emailJobId }
                );
            }

            if (follower.channels.includes("inApp")) {
                if (eventId) {
                    try {
                        await Delivery.findOneAndUpdate(
                            { eventId, userId: follower.userId, channel: "inApp" },
                            { $setOnInsert: { status: "pending", attempts: 0 } },
                            { upsert: true, new: true }
                        );
                    } catch (error) {
                        if (error.code !== 11000) {
                            console.error("Fanout: inApp Delivery upsert failed", error.message);
                        }
                    }
                }

                const inAppJobId = eventId
                    ? `inapp:${eventId}:${userIdStr}`
                    : undefined;

                await inAppQueue.add(
                    "send-inapp",
                    { eventId, userId: follower.userId, type, payload },
                    { jobId: inAppJobId }
                );
            }
        }
    },
    { connection: redisConnection },
);

fanoutWorker.on("failed", (job, err) => {
    console.error(`❌ [Fanout Worker] Job ${job?.id} failed:`, err.message);
});

module.exports = fanoutWorker;