# Update (sections)

Update a single sections record.

Body parameters could be sent as `application/json` or `multipart/form-data`.

File upload is supported only via `multipart/form-data`.

```javascript
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://addb.ignaciothompson.com');

...

// example update data
const data = {};

const record = await pb.collection('sections').update('RECORD_ID', data);
```

## API details

**PATCH** `/api/collections/sections/records/:id`

### Path parameters

| Param | Type | Description |
| :--- | :--- | :--- |
| `id` | String | ID of the record to update. |

### Query parameters

| Param | Type | Description |
| :--- | :--- | :--- |
| `expand` | String | Auto expand relations when returning the updated record. Ex.: `?expand=relField1,relField2.subRelField21` <br> Supports up to 6-levels depth nested relations expansion. |
| `fields` | String | Comma separated string of the fields to return in the JSON response (by default returns all fields). Ex.: `?fields=*,expand.relField.name` <br> `*` targets all keys from the specific depth level. <br> Supports field modifiers like `:excerpt(200,true)`. |

### Responses

#### Response 200

```json
{
  "collectionId": "pbc_1809324929",
  "collectionName": "sections",
  "id": "test"
}
```

#### Response 400

```json
{
  "status": 400,
  "message": "Failed to update record.",
  "data": {
    "id": {
      "code": "validation_required",
      "message": "Missing required value."
    }
  }
}
```

#### Response 403

```json
{
  "status": 403,
  "message": "You are not allowed to perform this request.",
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