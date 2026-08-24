const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    read: {
      type: Boolean,
      default: false,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  }
);

// Index for faster user notification queries
NotificationSchema.index({ userId: 1 });

// Automatically delete notifications after 30 days
NotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 2592000 }
);

const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = Notification;