const { Router } = require('express');
const protect = require("../middleware/auth.middleware");
const adminOnly = require("../middleware/admin.middleware");
const {
  getSystemMetrics,
  getFailedDeliveries,
  retryFailedDelivery,
  clearAnalyticsData,
} = require("../controllers/analytics.controller");

const router = Router();

router.use(protect);

router.get("/", getSystemMetrics);

router.get("/failures", getFailedDeliveries);

router.post("/retry/:id", retryFailedDelivery);

router.delete("/nuke", adminOnly, clearAnalyticsData);

module.exports = router;
