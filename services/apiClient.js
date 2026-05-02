const axios = require('axios');

const BASE_URL = 'http://20.207.122.201/evaluation-service';

// --- MOCK DATA ---
const MOCK_DEPOTS = [
    { id: "depot-1", mechanicHours: 10 },
    { id: "depot-2", mechanicHours: 15 }
];

const MOCK_TASKS = [
    { id: "task-1", duration: 2, impactScore: 50 },
    { id: "task-2", duration: 3.5, impactScore: 80 },
    { id: "task-3", duration: 4, impactScore: 60 },
    { id: "task-4", duration: 1.5, impactScore: 30 },
    { id: "task-5", duration: 5, impactScore: 100 }
];

const MOCK_NOTIFICATIONS = [
    { "ID": "n1", "Type": "Event", "Message": "Workshop tomorrow", "Timestamp": "2026-05-01 10:00:00" },
    { "ID": "n2", "Type": "Placement", "Message": "Interview scheduled", "Timestamp": "2026-05-02 10:00:00" },
    { "ID": "n3", "Type": "Result", "Message": "Grades released", "Timestamp": "2026-05-01 15:00:00" },
    { "ID": "n4", "Type": "Placement", "Message": "Job fair", "Timestamp": "2026-04-30 10:00:00" },
    { "ID": "n5", "Type": "Event", "Message": "Welcome", "Timestamp": "2026-04-20 10:00:00" }
];
// -----------------

const createApiClient = (token) => {
    return axios.create({
        baseURL: BASE_URL,
        headers: {
            'Authorization': token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '',
            'Content-Type': 'application/json'
        }
    });
};

const getDepots = async (token) => {
    try {
        if (!token || token === "QkbpxH" || token.includes("YOUR_")) throw new Error("Mock fallback triggered");
        const client = createApiClient(token);
        const response = await client.get('/depots');
        return response.data;
    } catch (error) {
        console.warn('Using MOCK DEPOTS due to missing/invalid token or API error.');
        return MOCK_DEPOTS;
    }
};

const getTasks = async (token, depotId) => {
    try {
        if (!token || token === "QkbpxH" || token.includes("YOUR_")) throw new Error("Mock fallback triggered");
        const client = createApiClient(token);
        const response = await client.get(`/tasks?depotId=${depotId}`);
        return response.data;
    } catch (error) {
        console.warn(`Using MOCK TASKS for depot ${depotId}.`);
        return MOCK_TASKS;
    }
};

const getNotifications = async (token) => {
    try {
        if (!token || token === "QkbpxH" || token.includes("YOUR_")) throw new Error("Mock fallback triggered");
        const client = createApiClient(token);
        const response = await client.get('/notifications');
        return response.data;
    } catch (error) {
        console.warn('Using MOCK NOTIFICATIONS.');
        return { notifications: MOCK_NOTIFICATIONS };
    }
};

module.exports = {
    getDepots,
    getTasks,
    getNotifications
};
