const express = require("express");

const {
  getSubscriptions,
  getUsers,
  getUserById,
  toggleWatchlist,
  armAll,
} = require("../controllers/user.controller");

const protect = require("../middleware/auth.middleware");
const checkOwnership = require("../middleware/ownership.middleware");

const router = express.Router();

router.get("/", protect, getUsers);

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