const Delivery = require("../models/delivery.model");
const Event = require("../models/event.model");
const emailQueue = require("../queues/email.queue");
const inAppQueue = require("../queues/inapp.queue");

/**
 * GET /api/analytics
 * System health / delivery metrics
 */
const getSystemMetrics = async (req, res) => {
  try {
    const stats = await Delivery.aggregate([
      {
        $group: {
          _id: null,
          totalProcessed: { $sum: 1 },

          successful: {
            $sum: {
              $cond: [{ $eq: ["$status", "success"] }, 1, 0],
            },
          },

          failed: {
            $sum: {
              $cond: [{ $eq: ["$status", "failed"] }, 1, 0],
            },
          },

          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalProcessed: 1,
          successful: 1,
          failed: 1,
          pending: 1,

          successRate: {
            $cond: [
              { $eq: ["$totalProcessed", 0] },
              100,
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: ["$successful", "$totalProcessed"],
                      },
                      100,
                    ],
                  },
                  1,
                ],
              },
            ],
          },
        },
      },
    ]);

    res.status(200).json(
      stats[0] || {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        pending: 0,
        successRate: 100,
      }
    );
  } catch (error) {
    console.error("[Analytics] Failed to fetch metrics:", error);

    res.status(500).json({
      error: "Failed to fetch system metrics",
      message: error.message,
    });
  }
};

/**
 * GET /api/analytics/failures
 * Get failed deliveries / DLQ
 */
const getFailedDeliveries = async (req, res) => {
  try {
    const failures = await Delivery.find({ status: "failed" })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("userId", "name email")
      .populate("eventId", "type payload")
      .lean();

    const categorizedFailures = failures.map((delivery) => {
      const errorMessage =
        delivery.errorMessage || "Unknown SMTP / Socket error";

      let faultType = "SYSTEM_INFRASTRUCTURE_ERROR";
      let actionable = true;

      if (
        errorMessage.includes("552") ||
        errorMessage.includes("Mailbox is full") ||
        errorMessage.includes("Quota exceeded")
      ) {
        faultType = "USER_QUOTA_EXCEEDED";
        actionable = false;
      } else if (
        errorMessage.includes("550") ||
        errorMessage.includes("User unknown") ||
        errorMessage.includes("Invalid domain")
      ) {
        faultType = "INVALID_EMAIL_ADDRESS";
        actionable = false;
      }

      return {
        _id: delivery._id,
        channel: delivery.channel,
        user: delivery.userId,
        event: delivery.eventId,
        errorMessage,
        faultType,
        actionable,
        failedAt: delivery.updatedAt || delivery.createdAt,
      };
    });

    res.status(200).json(categorizedFailures);
  } catch (error) {
    console.error("[Analytics] Failed to fetch failures:", error);

    res.status(500).json({
      error: "Failed to fetch failed deliveries",
      message: error.message,
    });
  }
};

/**
 * POST /api/analytics/retry/:id
 * Re-queue a failed delivery
 */
const retryFailedDelivery = async (req, res) => {
  try {
    const { id } = req.params;

    const delivery = await Delivery.findById(id).populate("eventId");

    if (!delivery) {
      return res.status(404).json({
        error: "Delivery record not found",
      });
    }

    if (delivery.status !== "failed") {
      return res.status(400).json({
        error: "Only failed deliveries can be retried",
      });
    }

    const event = delivery.eventId;

    if (!event) {
      return res.status(404).json({
        error: "Original event payload no longer exists",
      });
    }

    const jobId = `retry:${delivery._id}:${Date.now()}`;

    /**
     * Queue the job first.
     * Only mark the DB record as pending after the queue
     * successfully accepts the job.
     */
    if (delivery.channel === "email") {
      await emailQueue.add(
        "send-email",
        {
          eventId: event._id,
          userId: delivery.userId,
          subject: `[Retry] Alert: ${event.type
            .replace("_", " ")
            .toUpperCase()}`,
          message: `An update occurred on a topic you follow: ${event.type
            .replace("_", " ")
            .toUpperCase()}`,
          payload: event.payload,
        },
        {
          jobId,
        }
      );
    } else if (delivery.channel === "inApp") {
      await inAppQueue.add(
        "send-inapp",
        {
          eventId: event._id,
          userId: delivery.userId,
          message: `[Retry] Alert: ${event.type
            .replace("_", " ")
            .toUpperCase()}!`,
          payload: event.payload,
        },
        {
          jobId,
        }
      );
    } else {
      return res.status(400).json({
        error: `Unsupported delivery channel: ${delivery.channel}`,
      });
    }

    delivery.status = "pending";
    await delivery.save();

    console.log(
      `♻️ [Analytics] Delivery ${delivery._id} re-queued via ${delivery.channel}`
    );

    res.status(200).json({
      success: true,
      message: "Job successfully re-queued",
      delivery,
    });
  } catch (error) {
    console.error("[Analytics] Retry failed:", error);

    res.status(500).json({
      error: "Failed to retry delivery",
      message: error.message,
    });
  }
};

/**
 * DELETE /api/analytics/nuke
 *
 * Dangerous admin/debug endpoint.
 * Do NOT expose this publicly without authentication/authorization.
 */
const clearAnalyticsData = async (req, res) => {
  try {
    await Delivery.deleteMany({});
    await Event.deleteMany({});

    res.status(200).json({
      success: true,
      message: "Analytics delivery/event data wiped successfully.",
    });
  } catch (error) {
    console.error("[Analytics] Failed to clear data:", error);

    res.status(500).json({
      error: "Failed to clear analytics data",
      message: error.message,
    });
  }
};

module.exports = {
  getSystemMetrics,
  getFailedDeliveries,
  retryFailedDelivery,
  clearAnalyticsData,
};