const { getDepots, getTasks } = require('./apiClient');
const { solveKnapsack } = require('./knapsack');

const generateSchedules = async (token) => {
    // 1. Fetch depots
    const depots = await getDepots(token);
    
    if (!Array.isArray(depots)) {
        throw new Error('Invalid response from depots API');
    }

    // 2. For each depot, fetch tasks and run knapsack algorithm
    const processDepot = async (depot) => {
        const depotId = depot.id;
        const availableHours = depot.availableMechanicHours || depot.mechanicHours || 8; 
        
        try {
            const tasks = await getTasks(token, depotId);
            const { selectedTasks, totalImpact, totalTime } = solveKnapsack(tasks, availableHours);
            
            return {
                depotId,
                selectedTasks,
                totalImpact,
                totalTime
            };
        } catch (err) {
            console.error(`Failed to process depot ${depotId}:`, err);
            return {
                depotId,
                error: 'Failed to generate schedule for this depot',
                selectedTasks: [],
                totalImpact: 0,
                totalTime: 0
            };
        }
    };

    return await Promise.all(depots.map(processDepot));
};

module.exports = {
    generateSchedules
};
