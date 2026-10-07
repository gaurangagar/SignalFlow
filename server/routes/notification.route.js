const { Router } = require('express');
const {
    triggerEvent,
    getNotifications,
    followTopic,
    unfollowTopic,
    createTopic,
    clearNotifications
} = require('../controllers/notification.controller');
const protect = require('../middleware/auth.middleware');
const checkOwnership = require('../middleware/ownership.middleware');

const router = Router();

// Event & Topic endpoints (Protected)
router.post('/trigger-event', protect, triggerEvent);
router.post('/create-topic', protect, createTopic);

// User-scoped notification & subscription endpoints (Protected + Ownership verification)
router.get('/:userId/notifications', protect, checkOwnership, getNotifications);
router.post('/:userId/follow/:topicId', protect, checkOwnership, followTopic);
router.post('/:userId/unfollow/:topicId', protect, checkOwnership, unfollowTopic);
router.delete('/:userId/clear-notifications', protect, checkOwnership, clearNotifications);

module.exports = router;
