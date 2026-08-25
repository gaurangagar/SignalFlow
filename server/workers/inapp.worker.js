const { Worker } = require("bullmq");
const redisConnection = require("../config/ioredis");
const User = require("../models/user.model");
const Notification = require("../models/notification.model");
const Delivery = require("../models/delivery.model");
const { getIO } = require("../config/socket");

const inappWorker = new Worker(
  "inapp-queue",
  async (job) => {
    const { eventId, userId, type, payload } = job.data;
    console.log(`🔔 In-App Worker: Processing alert for User ID ${userId}`);

    // THE SAFETY NET: Check if user exists before doing anything!
    const user = await User.findById(userId);
    if (!user) {
      console.error(
        `In-App Worker: User ID ${userId} not found in MongoDB! Skipping.`
      );

      // Marks DB receipt as failed so dashboard counts don't get stuck in pending
      if (eventId) {
        await Delivery.findOneAndUpdate(
          { eventId: eventId, userId: userId, channel: "inApp" },
          {
            status: "failed",
            errorMessage: "User account was deleted from database.",
            faultType: "ORPHANED_USER",
          }
        );
      }
      return;
    }

    try {
      // Safely extract the product details
      const productName = payload?.productName || "An item on your watchlist";
      const newPrice = payload?.newPrice || "a new low price";

      let newNotification = null;

      // 1. Create the actual Notification document so it shows up in the user's UI (bell icon)
      if (eventId) {
        newNotification = await Notification.create({
          userId: userId,
          eventId: eventId,
          message: `Price Drop Alert: ${productName} is now $${newPrice}!`,
          read: false,
        });
      }

      // 2. ⚡ THE REAL-TIME MAGIC: Emit via Socket.io to the React Frontend!
      try {
        const io = getIO();
        // NOTE: In config/socket.js, users join room: `user:${userId}`
        io.to(`user:${userId}`).emit("notification", {
          message: `Price Drop Alert: ${productName} is now $${newPrice}!`,
          notification: newNotification,
        });
        console.log(
          `⚡ Socket.io: Emitted live alert to User Room "user:${userId}"`
        );
      } catch (socketErr) {
        console.warn(
          "⚠️ Socket emission failed (User might be offline):",
          socketErr.message
        );
      }

      // 3. Update the Dashboard Receipt to SUCCESS
      if (eventId) {
        await Delivery.findOneAndUpdate(
          { eventId: eventId, userId: userId, channel: "inApp" },
          { status: "success", sentAt: new Date() }
        );
      }

      console.log(
        `✅ In-App Worker: Alert saved and tracked for User ID ${userId}`
      );
    } catch (error) {
      console.error(
        `❌ In-App Worker Failed for User ID ${userId}:`,
        error.message
      );

      // 4. Mark the Dashboard Receipt as FAILED if something crashes
      if (eventId) {
        await Delivery.findOneAndUpdate(
          { eventId: eventId, userId: userId, channel: "inApp" },
          {
            status: "failed",
            errorMessage: error.message,
            faultType: "INAPP_SAVE_ERROR",
          }
        );
      }
      throw error;
    }
  },
  { connection: redisConnection }
);

inappWorker.on("failed", (job, err) => {
  console.error(`❌ [In-App Worker] Job ${job?.id} failed:`, err.message);
});

module.exports = inappWorker;