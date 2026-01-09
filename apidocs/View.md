# View (sections)

Fetch a single sections record.

```javascript
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://addb.ignaciothompson.com');

...

const record = await pb.collection('sections').getOne('RECORD_ID', {
    expand: 'relField1,relField2.subRelField',
});
```

## API details

**GET** `/api/collections/sections/records/:id`

### Path Parameters

| Param | Type | Description |
| :--- | :--- | :--- |
| `id` | String | ID of the record to view. |

### Query parameters

| Param | Type | Description |
| :--- | :--- | :--- |
| `expand` | String | Auto expand record relations. Ex.: `?expand=relField1,relField2.subRelField` <br> Supports up to 6-levels depth nested relations expansion. |
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

#### Response 404

```json
{
  "status": 404,
  "message": "The requested resource wasn't found.",
  "data": {}
}
```