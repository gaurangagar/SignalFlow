const { Router } = require("express");
const {
  getSubscriptions,
  getUsers,
  getUserById,
  toggleWatchlist,
  armAll,
} = require("../controllers/user.controller");
const protect = require("../middleware/auth.middleware");
const adminOnly = require("../middleware/admin.middleware");
const checkOwnership = require("../middleware/ownership.middleware");

const router = Router();

router.get("/", protect, adminOnly, getUsers);

router.get("/:userId", protect, checkOwnership, getUserById);

router.get("/:userId/subscriptions", protect, checkOwnership, getSubscriptions);

router.patch(
  "/:userId/watchlist",
  protect,
  checkOwnership,
  toggleWatchlist
);

router.post(
  "/:userId/arm-all",
  protect,
  checkOwnership,
  armAll
);

module.exports = router;
