const { Queue } = require("bullmq");
const redisConnection = require("../config/ioredis");

const fanoutQueue = new Queue("fanout-queue", {
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

console.log('📦 BullMQ "fanout-queue" is ready for rate-limited fanout delivery!');

module.exports = fanoutQueue;
