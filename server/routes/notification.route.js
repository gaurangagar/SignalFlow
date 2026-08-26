const express = require('express');
const {
    triggerEvent,
    getNotifications,
    followTopic,
    unfollowTopic,
    createTopic,
    clearNotifications
} = require('../controllers/notification.controller');

const router = express.Router();

router.post('/trigger-event', triggerEvent);
router.get('/:userId/notifications', getNotifications);
router.post('/:userId/follow/:topicId', followTopic);
router.post('/:userId/unfollow/:topicId', unfollowTopic);
router.post('/create-topic', createTopic);
router.delete('/:userId/clear-notifications', clearNotifications);

module.exports = router;