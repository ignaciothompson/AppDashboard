# Realtime (sections)

Subscribe to realtime changes via Server-Sent Events (SSE).

Events are sent for **create**, **update** and **delete** record operations.

-   When you subscribe to a **single record**, the collection's **ViewRule** will be used to determine whether the subscriber has access to receive the event message.
-   When you subscribe to an **entire collection**, the collection's **ListRule** will be used to determine whether the subscriber has access to receive the event message.

```javascript
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://addb.ignaciothompson.com');

...

// (Optionally) authenticate
await pb.collection('users').authWithPassword('test@example.com', '123456');

// Subscribe to changes in any sections record
pb.collection('sections').subscribe('*', function (e) {
    console.log(e.action);
    console.log(e.record);
}, { /* other options like: filter, expand, custom headers, etc. */ });

// Subscribe to changes only in the specified record
pb.collection('sections').subscribe('RECORD_ID', function (e) {
    console.log(e.action);
    console.log(e.record);
}, { /* other options like: filter, expand, custom headers, etc. */ });

// Unsubscribe
pb.collection('sections').unsubscribe('RECORD_ID'); // remove all 'RECORD_ID' subscriptions
pb.collection('sections').unsubscribe('*'); // remove all '*' topic subscriptions
pb.collection('sections').unsubscribe(); // remove all subscriptions in the collection
```

## API details

**SSE** `/api/realtime`

### Event data format

```json
{
  "action": "create", // create, update or delete
  "record": {
    "collectionId": "pbc_1809324929",
    "collectionName": "sections",
    "id": "test"
  }
}
```