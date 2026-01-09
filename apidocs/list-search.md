# List/Search (sections)

Fetch a paginated sections records list, supporting sorting and filtering.

```javascript
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://addb.ignaciothompson.com');

...

// fetch a paginated records list
const resultList = await pb.collection('sections').getList(1, 50, {
    filter: 'someField1 != someField2',
});

// you can also fetch all records at once via getFullList
const records = await pb.collection('sections').getFullList({
    sort: '-someField',
});

// or fetch only the first record that matches the specified filter
const record = await pb.collection('sections').getFirstListItem('someField="test"', {
    expand: 'relField1,relField2.subRelField',
});
```

## API details

**GET** `/api/collections/sections/records`

### Query parameters

| Param | Type | Description |
| :--- | :--- | :--- |
| `page` | Number | The page (aka. offset) of the paginated list (default to 1). |
| `perPage` | Number | Specify the max returned records per page (default to 30). |
| `sort` | String | Specify the records order attribute(s). <br> Add `-` / `+` (default) in front of the attribute for DESC / ASC order. Ex.: `?sort=-created,id` <br> Supported record sort fields: `@random`, `@rowid`, `id` |
| `filter` | String | Filter the returned records. Ex.: `?filter=(id='abc' && created>'2022-01-01')` |
| `expand` | String | Auto expand record relations. Ex.: `?expand=relField1,relField2.subRelField` <br> Supports up to 6-levels depth nested relations expansion. |
| `fields` | String | Comma separated string of the fields to return in the JSON response (by default returns all fields). Ex.: `?fields=*,expand.relField.name` <br> `*` targets all keys from the specific depth level. <br> Supports field modifiers like `:excerpt(200,true)`. |
| `skipTotal` | Boolean | If it is set the total counts query will be skipped and the response fields `totalItems` and `totalPages` will have `-1` value. |

### Responses

#### Response 200

```json
{
  "page": 1,
  "perPage": 30,
  "totalPages": 1,
  "totalItems": 2,
  "items": [
    {
      "collectionId": "pbc_1809324929",
      "collectionName": "sections",
      "id": "test"
    },
    {
      "collectionId": "pbc_1809324929",
      "collectionName": "sections",
      "id": "test2"
    }
  ]
}
```

#### Response 400

```json
{
  "status": 400,
  "message": "Something went wrong while processing your request. Invalid filter.",
  "data": {}
}
```