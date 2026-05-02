/**
 * Solves the 0/1 Knapsack Problem for scheduling vehicle maintenance tasks.
 * 
 * @param {Array} tasks - Array of task objects { id, duration, impactScore }
 * @param {number} timeLimitHours - Maximum available mechanic hours
 * @returns {Object} - Object containing selected task IDs, total impact, and total duration used
 */
const solveKnapsack = (tasks, timeLimitHours) => {
    // Convert hours to minutes to ensure integer weights for the DP array
    // This avoids float index issues in DP.
    const capacity = Math.floor(timeLimitHours * 60);
    const items = tasks.map(t => ({
        ...t,
        weight: Math.floor(t.duration * 60),
        value: t.impactScore
    }));

    const n = items.length;
    // dp[i][w] will store the maximum impact possible with first i items and weight limit w
    const dp = Array.from({ length: n + 1 }, () => Array(capacity + 1).fill(0));

    // Build table dp[][] in bottom-up manner
    for (let i = 1; i <= n; i++) {
        const itemWeight = items[i - 1].weight;
        const itemValue = items[i - 1].value;

        for (let w = 0; w <= capacity; w++) {
            if (itemWeight <= w) {
                // Max of including the item or not including it
                dp[i][w] = Math.max(itemValue + dp[i - 1][w - itemWeight], dp[i - 1][w]);
            } else {
                dp[i][w] = dp[i - 1][w];
            }
        }
    }

    // Find the selected items by backtracking from dp[n][capacity]
    let res = dp[n][capacity];
    let w = capacity;
    const selectedTasks = [];
    let totalTimeUsedMinutes = 0;

    for (let i = n; i > 0 && res > 0; i--) {
        // If the value came from the row above, item wasn't included
        if (res === dp[i - 1][w]) {
            continue;
        } else {
            // This item is included.
            const item = items[i - 1];
            selectedTasks.push(item);
            
            // Since this weight is included, deduct its value and weight
            res -= item.value;
            w -= item.weight;
            totalTimeUsedMinutes += item.weight;
        }
    }

    // Since we iterated backwards, the tasks are in reverse order of selection.
    // Reversing them isn't strictly necessary for a set of tasks, but keeps it ordered nicely.
    selectedTasks.reverse();

    return {
        selectedTasks: selectedTasks.map(t => t.id), // Returning just the IDs as per requirement
        totalImpact: dp[n][capacity],
        totalTime: +(totalTimeUsedMinutes / 60).toFixed(2) // Convert back to hours
    };
};

module.exports = {
    solveKnapsack
};
