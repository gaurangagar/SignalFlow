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

        const followers = await Follow.find({ topicId: String(topicId) }).lean();
        console.log(`Found ${followers.length} followers for topic ${topicId}`);

        if (followers.length === 0) return;

        // 1. Batch user existence check to eliminate N+1 User.exists queries
        const followerUserIds = followers.map((f) => f.userId);
        const existingUsers = await User.find({ _id: { $in: followerUserIds } })
            .select("_id")
            .lean();
        const existingUserIdSet = new Set(existingUsers.map((u) => u._id.toString()));

        const missingUserIds = [];
        const activeFollowers = [];
        for (const follower of followers) {
            if (existingUserIdSet.has(follower.userId.toString())) {
                activeFollowers.push(follower);
            } else {
                missingUserIds.push(follower.userId);
            }
        }

        if (missingUserIds.length > 0) {
            console.log(`Skipping ${missingUserIds.length} missing user(s), cleaning up follows`);
            await Follow.deleteMany({ userId: { $in: missingUserIds } });
        }

        if (activeFollowers.length === 0) return;

        // 2. Batch Delivery upserts and check already-succeeded email deliveries
        let succeededEmailUserIds = new Set();
        if (eventId) {
            const deliveryOps = [];
            for (const follower of activeFollowers) {
                for (const channel of ["email", "inApp"]) {
                    if (follower.channels.includes(channel)) {
                        deliveryOps.push({
                            updateOne: {
                                filter: { eventId, userId: follower.userId, channel },
                                // $setOnInsert ensures we never overwrite an existing delivery
                                // record (e.g. one already marked 'success' or 'failed').
                                update: { $setOnInsert: { status: "pending", attempts: 0 } },
                                upsert: true,
                            },
                        });
                    }
                }
            }

            if (deliveryOps.length > 0) {
                try {
                    await Delivery.bulkWrite(deliveryOps, { ordered: false });
                } catch (error) {
                    const isOnlyDuplicateKey =
                        error.code === 11000 ||
                        (Array.isArray(error.writeErrors) &&
                            error.writeErrors.every((e) => e.code === 11000));
                    if (!isOnlyDuplicateKey) {
                        console.error("Fanout: Delivery bulkWrite failed", error.message);
                    }
                }
            }

            const succeededEmails = await Delivery.find({
                eventId,
                userId: { $in: activeFollowers.map((f) => f.userId) },
                channel: "email",
                status: "success",
            })
                .select("userId")
                .lean();
            succeededEmailUserIds = new Set(
                succeededEmails.map((d) => d.userId.toString())
            );
        }

        // 3. Batch enqueue jobs with addBulk in parallel
        const emailJobs = [];
        const inAppJobs = [];

        for (const follower of activeFollowers) {
            const userIdStr = follower.userId.toString();

            if (follower.channels.includes("email") && !succeededEmailUserIds.has(userIdStr)) {
                emailJobs.push({
                    name: "send-email",
                    data: { eventId, userId: follower.userId, type, payload },
                    opts: eventId ? { jobId: `email:${eventId}:${userIdStr}` } : {},
                });
            }

            if (follower.channels.includes("inApp")) {
                inAppJobs.push({
                    name: "send-inapp",
                    data: { eventId, userId: follower.userId, type, payload },
                    opts: eventId ? { jobId: `inapp:${eventId}:${userIdStr}` } : {},
                });
            }
        }

        await Promise.all([
            emailJobs.length > 0 ? emailQueue.addBulk(emailJobs) : Promise.resolve(),
            inAppJobs.length > 0 ? inAppQueue.addBulk(inAppJobs) : Promise.resolve(),
        ]);
    },
    { connection: redisConnection },
);

fanoutWorker.on("failed", (job, err) => {
    console.error(`❌ [Fanout Worker] Job ${job?.id} failed:`, err.message);
});

module.exports = fanoutWorker;