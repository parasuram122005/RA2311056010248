const { getPriorityInbox } = require('./services/priorityInbox');

async function runStage6() {
    console.log("======================================================");
    console.log("STAGE 6: PRIORITY INBOX");
    console.log("======================================================");
    console.log("Fetching notifications from API...\n");
    
    // Using a dummy token, it will trigger the fallback mock data 
    // unless you supply a real token.
    try {
        const topNotifications = await getPriorityInbox("TEST_TOKEN", 10);
        
        console.log(`Successfully fetched Top ${topNotifications.length} Notifications:`);
        console.table(topNotifications);
        
        console.log("\n======================================================");
        console.log("Priority Sorting Rules Applied:");
        console.log("1. Weight (Placement > Result > Event)");
        console.log("2. Recency (Newest first)");
        console.log("======================================================");
    } catch (err) {
        console.error("Error running Stage 6 logic:", err.message);
    }
}

runStage6();
