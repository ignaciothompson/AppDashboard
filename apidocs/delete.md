# Delete (sections)

Delete a single sections record.

```javascript
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://addb.ignaciothompson.com');

...

await pb.collection('sections').delete('RECORD_ID');
```

## API details

**DELETE** `/api/collections/sections/records/:id`

### Path parameters

| Param | Type | Description |
| :--- | :--- | :--- |
| `id` | String | ID of the record to delete. |

### Responses

#### Response 204

`null`

#### Response 400

```json
{
  "status": 400,
  "message": "Failed to delete record. Make sure that the record is not part of a required relation reference.",
  "data": {}
}
```

#### Response 404

```json
{
  "status": 404,
  "message": "The requested resource wasn't found.",
  "data": {}
}
```