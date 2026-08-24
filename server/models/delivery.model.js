const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DeliverySchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    channel: {
      type: String,
      enum: ["email", "inApp"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },

    attempts: {
      type: Number,
      default: 0,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    errorMessage: {
      type: String,
    },

    faultType: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate deliveries for the same event, user, and channel
DeliverySchema.index(
  { eventId: 1, userId: 1, channel: 1 },
  { unique: true }
);

// Faster status-based metric queries
DeliverySchema.index({ status: 1 });

const Delivery = mongoose.model("Delivery", DeliverySchema);

module.exports = Delivery;