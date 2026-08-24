const Redis = require("ioredis");

const redisConnection = new Redis({ maxRetriesPerRequest: null });

redisConnection.on("connect", () => {
  console.log("Redis Connected Successfully!");
});

redisConnection.on("error", (err) => {
  console.error("Redis Connection Error:", err.message);
});

module.exports = redisConnection;