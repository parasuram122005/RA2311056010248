# Stage 1

### REST API Design for Notifications

To display real-time notifications to logged-in users, the platform should support the following core actions:
1. **Fetch Notifications**: Retrieve a paginated list of notifications for the user.
2. **Mark as Read**: Update the status of a specific notification to "read".
3. **Receive Real-Time Updates**: Maintain a persistent connection to receive new notifications instantly without refreshing.

#### 1. Fetch Notifications (GET)
**Endpoint:** `GET /api/v1/notifications`
**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```
**JSON Request:** None (Uses Query Parameters for pagination: `?page=1&limit=20`)
**JSON Response (200 OK):**
```json
{
  "notifications": [
    {
      "ID": "d146095a-0d86-4a34-9e69-3900a14576bc",
      "Type": "Result",
      "Message": "mid-sem",
      "Timestamp": "2026-04-22 17:51:30",
      "isRead": false
    }
  ],
  "meta": {
    "totalCount": 1,
    "page": 1,
    "limit": 20
  }
}
```

#### 2. Mark Notification as Read (PATCH)
**Endpoint:** `PATCH /api/v1/notifications/{id}/read`
**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```
**JSON Request:** Empty Body
**JSON Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification marked as read successfully"
}
```

#### Mechanism for Real-Time Notifications
To push notifications to users in real-time, I highly suggest using **Server-Sent Events (SSE)**. SSE is a unidirectional protocol (Server to Client) which perfectly fits the notification use-case, is natively supported by browsers, requires less overhead than WebSockets, and handles automatic reconnections out-of-the-box.

---

# Stage 2

### Persistent Storage

**Suggested DB:** PostgreSQL (Relational DB)
**Explanation:** Notifications are inherently structured and highly relational (tied to users/students). PostgreSQL offers excellent ACID compliance for reliability, powerful indexing for fast querying, and supports `JSONB` if we need to store dynamic metadata in the future.

#### DB Schema
```sql
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studentID INT NOT NULL,
    notificationType notification_type NOT NULL,
    message TEXT NOT NULL,
    isRead BOOLEAN DEFAULT false,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Problems with Increasing Data Volume
As the table grows to millions of rows, querying `WHERE studentID = ? AND isRead = false` becomes a sequential scan, drastically slowing down read operations and causing high CPU/IO load on the database server. Space utilization will also grow continuously, eventually causing performance degradation during backups or index rebuilding.

#### Solving the Problems
1. **Indexing:** Add composite indexes on `(studentID, isRead)` to speed up read queries.
2. **Archiving/Partitioning:** Partition the table by `createdAt` (e.g., monthly partitions) to keep the active index size small, or archive notifications older than 6 months to cold storage.

---

# Stage 3

### Analyzing the Slow Query
**Query:**
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```
**Is it accurate?** Yes, it logically returns the correct unread notifications for a specific student, sorted by the newest first.
**Why is it slow?** Without appropriate indexes, the database engine must scan the entire 5,000,000-row table sequentially to find the rows matching `studentID = 1042` and `isRead = false`, and then perform an expensive sort operation in memory for `ORDER BY createdAt DESC`.
**What to change & Computation Cost:** I would add a composite index. By creating an index on `(studentID, isRead, createdAt DESC)`, the computation cost transforms from `O(N)` (Full Table Scan + Sort) to `O(log N)` (B-Tree traversal), as the database can jump directly to the student's unread records already sorted by time.

### The "Index Every Column" Advice
**Is this advice effective?** No. 
**Why not?** Adding indexes to every column is a massive anti-pattern. While it speeds up `SELECT` queries for arbitrary columns, it severely degrades `INSERT`, `UPDATE`, and `DELETE` performance because every single index must be synchronously updated during write operations. It also consumes excessive disk space and RAM (index bloat).

### Query for Placement Notifications (Last 7 Days)
```sql
SELECT DISTINCT studentID 
FROM notifications 
WHERE notificationType = 'Placement' 
  AND createdAt >= NOW() - INTERVAL '7 days';
```

---

# Stage 4

### Solving Database Overload on Page Load

When notifications are fetched on every page load for 50,000 students, the DB becomes a bottleneck.

1. **Redis Caching (Suggested Solution)**
   - **Strategy:** Cache the unread notification counts and top 10 recent notifications for active students in a Redis instance. When a page loads, the backend hits Redis (sub-millisecond latency) instead of the PostgreSQL DB.
   - **Tradeoffs:** Introduces cache invalidation complexity. If the DB is updated but Redis isn't instantly invalidated, users might see stale data for a few moments. Requires extra infrastructure cost.

2. **Lazy Loading via API**
   - **Strategy:** Only return the "unread count" integer on page load (which is heavily cached). Do not fetch the actual notification payloads until the user actively clicks the "Bell" icon.
   - **Tradeoffs:** Saves massive bandwidth and DB queries per page load, but introduces a slight latency when the user clicks the bell icon for the first time.

3. **Read Replicas**
   - **Strategy:** Route all `GET` requests to one or more database Read Replicas, while `POST/PATCH` go to the Primary DB.
   - **Tradeoffs:** Reduces load on the primary writer DB but introduces replication lag.

---

# Stage 5

### Shortcomings of the Pseudocode
The provided `notify_all` loop runs synchronously:
1. **Blocking Nature:** Sending emails over SMTP/API takes time (e.g., 500ms per email). Sending 50,000 emails sequentially will block the thread for hours. The HR will face an API timeout.
2. **Lack of Fault Tolerance:** Because `send_email` failed for 200 students midway, the loop throws an exception and halts. The remaining students never get notified, and there is no tracking of who received it and who didn't.

### Should DB save and email happen together?
**No.** Storing the notification in the DB (fast, high reliability) should be decoupled from sending the email (slow, network dependent). They should not happen synchronously in the same loop because a failure in the 3rd-party Email API should not prevent the in-app notification from being saved in the database.

### Redesign for Reliability and Speed
We must introduce a **Message Queue (e.g., RabbitMQ or Kafka)** and a background **Worker Service**. The API will instantly bulk-insert to the DB, publish messages to the Queue, and return success to HR. Workers will asynchronously consume the queue to send emails, automatically retrying on failure.

### Revised Pseudocode
```python
# API Endpoint (Executes instantly)
function notify_all_api(student_ids: array, message: string):
    # 1. Bulk insert to DB for high speed
    bulk_save_to_db(student_ids, message)
    
    # 2. Push to real-time app mechanism immediately
    bulk_push_to_app(student_ids, message)
    
    # 3. Publish to Message Queue for asynchronous email processing
    for student_id in student_ids:
        queue.publish(topic="send_email", payload={student_id, message})
        
    return "Notifications triggered successfully"

# Background Worker Process (Scalable, runs asynchronously)
function email_worker_consume(payload):
    try:
        send_email(payload.student_id, payload.message)
    except Exception:
        # Puts it back in the queue to retry automatically
        queue.retry(payload)
```

---

# Stage 6

### Approach for the Priority Inbox

The product manager requested a Priority Inbox showing the top `N` notifications determined by **Weight (Placement > Result > Event)** and **Recency (Timestamp)**. 

Since new notifications keep coming in, continuously calling a standard `array.sort()` on thousands of items (which operates in `O(N log N)` time) is inefficient.

**How to maintain the top N efficiently:**
To solve this, I implemented an approach using a **Min-Heap (Priority Queue)**. 
1. We define a priority mapping where `Placement = 3`, `Result = 2`, and `Event = 1`.
2. We iterate over the stream of incoming notifications.
3. We maintain a Min-Heap capped strictly at size `N` (e.g., 10).
4. If the heap has less than `N` elements, we simply insert the notification.
5. If the heap is full, we compare the new notification to the "smallest/lowest priority" notification sitting at the root of the Min-Heap. If the new notification has a higher priority (or is newer if priorities are tied), we pop the root and insert the new one.

**Complexity:** This maintains the top N items in `O(N log K)` time complexity (where `K` is the small constant `N`). Since `K` is very small (e.g., 10), the operation practically runs in linear `O(N)` time and `O(K)` space, making it exceptionally fast and memory-efficient compared to a full array sort. 

The executable JavaScript solution simulating this behavior dynamically fetches from the provided API and calculates the priority inbox without saving to a local database.
