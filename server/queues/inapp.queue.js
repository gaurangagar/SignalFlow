const { Queue } = require("bullmq");
const redisConnection = require("../config/ioredis");

const inAppQueue = new Queue("inapp-queue", {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

console.log('📦 BullMQ "inapp-queue" is ready for rate-limited in-app notifications!');

module.exports = inAppQueue;
