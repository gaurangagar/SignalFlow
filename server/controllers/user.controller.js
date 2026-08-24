const express = require("express");

const {
  getSubscriptions,
  getUsers,
  getUserById,
  toggleWatchlist,
  armAll,
} = require("../routes/user.route");

const router = express.Router();

router.get("/", getUsers);

router.get("/:userId", getUserById);

router.get("/:userId/subscriptions", getSubscriptions);

router.patch(
  "/:userId/watchlist",
  toggleWatchlist
);

router.post(
  "/:userId/arm-all",
  armAll
);

module.exports = router;