const express = require('express');
const { generateSchedules } = require('../services/scheduleGenerator');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const token = req.headers.authorization;

        const results = await generateSchedules(token);
        return res.json(results);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
