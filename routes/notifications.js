const express = require('express');
const { getPriorityInbox } = require('../services/priorityInbox');

const router = express.Router();

router.get('/priority', async (req, res, next) => {
    try {
        const token = req.headers.authorization;

        // Fetch top 10 notifications using our priority sorting logic
        const topNotifications = await getPriorityInbox(token, 10);
        
        return res.json({
            success: true,
            notifications: topNotifications
        });
    } catch (error) {
        console.error('Error fetching priority notifications:', error);
        next(error);
    }
});

module.exports = router;
