const express = require('express');
const { generateSchedules } = require('../services/scheduleGenerator');
const { getPriorityInbox } = require('../services/priorityInbox');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        // Pass token (might be undefined, handled by mock layer)
        const token = req.headers.authorization;

        // Fetch schedules and notifications concurrently
        const [schedules, priorityNotifications] = await Promise.all([
            generateSchedules(token),
            getPriorityInbox(token, 10)
        ]);

        return res.json({
            schedules,
            priorityNotifications
        });
    } catch (error) {
        console.error('Error in unified dashboard:', error);
        next(error);
    }
});

module.exports = router;
