const express = require("express");

const {
  getSubscriptions,
  getUsers,
  getUserById,
  toggleWatchlist,
  armAll,
} = require("../controllers/user.controller");

const protect = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, getUsers);

router.get("/:userId", protect, getUserById);

router.get("/:userId/subscriptions", protect, getSubscriptions);

router.patch(
  "/:userId/watchlist", protect,
  toggleWatchlist
);

router.post(
  "/:userId/arm-all", protect,
  armAll
);

module.exports = router;