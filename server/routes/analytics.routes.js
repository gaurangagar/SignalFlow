const { Router } = require('express');

const {
  getSystemMetrics,
  getFailedDeliveries,
  retryFailedDelivery,
  clearAnalyticsData,
} = require("../controllers/analytics.controller");

const router = Router();

/**
 * GET /api/analytics
 * System health metrics
 */
router.get("/", getSystemMetrics);

/**
 * GET /api/analytics/failures
 * Failed deliveries / DLQ
 */
router.get("/failures", getFailedDeliveries);

/**
 * POST /api/analytics/retry/:id
 * Retry a failed delivery
 */
router.post("/retry/:id", retryFailedDelivery);

/**
 * DELETE /api/analytics/nuke
 * Clear delivery/event data
 *
 * Protect this route with admin middleware in production.
 */
router.delete("/nuke", clearAnalyticsData);

module.exports = router;