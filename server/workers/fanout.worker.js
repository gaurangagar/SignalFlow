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

            if (follower.channels.includes("email")) {
                try {
                    if (eventId) {
                        await Delivery.findOneAndUpdate(
                            { eventId: eventId, userId: follower.userId, channel: "email" },
                            { status: "pending", attempts: 0 },
                            { upsert: true, new: true }
                        );
                    }
                } catch (error) {
                    console.error("Email delivery failed", error);
                }

                await emailQueue.add("send-email", {
                    eventId,
                    userId: follower.userId,
                    type,
                    payload
                });
            }

            if (follower.channels.includes('inApp')) {
                try {
                    if (eventId) {
                        await Delivery.findOneAndUpdate(
                            { eventId: eventId, userId: follower.userId, channel: "inApp" },
                            { status: "pending", attempts: 0 },
                            { upsert: true, new: true },
                        );
                    }
                } catch (error) {
                    console.error("In-App delivery failed", error);
                }

                await inAppQueue.add("send-inapp", {
                    eventId,
                    userId: follower.userId,
                    type,
                    payload,
                });
            }
        }
    },
    { connection: redisConnection },
);

fanoutWorker.on("failed", (job, err) => {
    console.error(`❌ [Fanout Worker] Job ${job?.id} failed:`, err.message);
});

module.exports=fanoutWorker;