const { getNotifications } = require('./apiClient');

/**
 * Priority Weights for sorting. Higher number means higher priority.
 */
const PRIORITY_WEIGHTS = {
    'Placement': 3,
    'Result': 2,
    'Event': 1,
    'Default': 0
};

/**
 * Stage 6: Priority Inbox Implementation
 * 
 * This function fetches notifications, sorts them by priority and recency,
 * and returns the top N (default 10).
 * 
 * @param {string} token - The auth token
 * @param {number} topN - Number of top notifications to return
 * @returns {Promise<Array>} Top N notifications
 */
const getPriorityInbox = async (token, topN = 10) => {
    // 1. Fetch all notifications from the API
    const response = await getNotifications(token);
    
    // Extract the array from the API response
    const notifications = response.notifications || [];

    // 2. Sort the notifications based on rules:
    //    Rule A: Priority (Placement > Result > Event)
    //    Rule B: Recency (Newer createdAt first)
    notifications.sort((a, b) => {
        const weightA = PRIORITY_WEIGHTS[a.Type] || PRIORITY_WEIGHTS['Default'];
        const weightB = PRIORITY_WEIGHTS[b.Type] || PRIORITY_WEIGHTS['Default'];

        if (weightA !== weightB) {
            // Sort descending by priority weight
            return weightB - weightA;
        }

        // If priority is the same, sort by recency (descending)
        const dateA = new Date(a.Timestamp.replace(' ', 'T')).getTime();
        const dateB = new Date(b.Timestamp.replace(' ', 'T')).getTime();
        
        return dateB - dateA;
    });

    // 3. Return Top N
    return notifications.slice(0, topN);
};

/*
================================================================================
EXPLANATION: Maintaining Top N Efficiently
================================================================================

While the above approach (`Array.prototype.sort`) is simple and works fine for 
a few hundred notifications per user (O(N log N) time complexity), it becomes 
inefficient if a user has thousands or millions of unread notifications.

To maintain the Top N efficiently over a massive dataset, we should use a 
Min-Heap (Priority Queue) of size N.

How a Min-Heap approach works:
1. Initialize an empty Min-Heap.
2. Iterate through the notifications (O(N)).
3. For each notification:
   - If the heap has < N items, insert it.
   - If the heap has N items, compare the current notification with the 
     *minimum* element in the heap (the root of the Min-Heap).
   - If the current notification has a *higher* priority/recency than the root, 
     pop the root and insert the new notification.
     
Time Complexity: O(N log K) where K is the number of items we want to keep (N=10).
Since K=10 is a tiny constant, the time complexity effectively becomes O(N).
Space Complexity: O(K), which is significantly better than sorting the entire array O(N).

In Node.js/JavaScript, since there is no built-in PriorityQueue class, we would 
typically implement a class `MinHeap` using an array and write `siftUp` / `siftDown` 
methods based on the custom comparator used in the `sort` method above.
================================================================================
*/

module.exports = {
    getPriorityInbox,
    PRIORITY_WEIGHTS
};
