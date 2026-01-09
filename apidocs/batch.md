# Batch create/update/upsert/delete (sections)

Batch and transactional create/update/upsert/delete of multiple records in a single request.

> The batch Web API need to be explicitly enabled and configured from the Dashboard settings.
> Because this endpoint process the requests in a single DB transaction it could degrade the performance of your application if not used with proper care.

```javascript
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://addb.ignaciothompson.com');

...

const batch = pb.createBatch();

batch.collection('sections').create({ ... });
batch.collection('sections').update('RECORD_ID', { ... });
batch.collection('sections').delete('RECORD_ID');
batch.collection('sections').upsert({ ... });

const result = await batch.send();
```

## API details

**POST** `/api/batch`

### Body Parameters

Body parameters could be sent as `application/json` or `multipart/form-data`.

**Required**

| Param | Type | Description |
| :--- | :--- | :--- |
| `requests` | `Array<Request>` | List of the requests to process. |

The supported batch request actions are:
-   record create - `POST /api/collections/{collection}/records`
-   record update - `PATCH /api/collections/{collection}/records/{id}`
-   record upsert - `PUT /api/collections/{collection}/records` (body must have `id`)
-   record delete - `DELETE /api/collections/{collection}/records/{id}`

Each batch **Request** element have the following properties:
-   `url` path (could include query parameters)
-   `method` (GET, POST, PUT, PATCH, DELETE)
-   `headers` (custom per-request Authorization header is not supported)
-   `body`

**Multipart/form-data Note**: The regular batch action fields are expected to be submitted as serialized json under the `@jsonPayload` field.

```javascript
const formData = new FormData();

formData.append("@jsonPayload", JSON.stringify({
    requests: [
        {
            method: "POST",
            url: "/api/collections/sections/records?fields=id",
            body: { someField: "test1" }
        },
        {
            method: "PATCH",
            url: "/api/collections/sections/records/RECORD_ID",
            body: { someField: "test2" }
        }
    ]
}))

// file for the first request
formData.append("requests.0.someFileField", new File(...))

// file for the second request
formData.append("requests.1.someFileField", new File(...))
```

### Responses

#### Response 200

```json
[
  {
    "status": 200,
    "body": {
      "collectionId": "pbc_1809324929",
      "collectionName": "sections",
      "id": "test"
    }
  },
  {
    "status": 200,
    "body": {
      "collectionId": "pbc_1809324929",
      "collectionName": "sections",
      "id": "test2"
    }
  }
]
```

#### Response 400

```json
{
  "status": 400,
  "message": "Batch transaction failed.",
  "data": {
    "requests": {
      "1": {
        "code": "batch_request_failed",
        "message": "Batch request failed.",
        "response": {
          "status": 400,
          "message": "Failed to create record.",
          "data": {
            "id": {
              "code": "validation_min_text_constraint",
              "message": "Must be at least 3 character(s).",
              "params": { "min": 3 }
            }
          }
        }
      }
    }
  }
}
```

#### Response 403

```json
{
  "status": 403,
  "message": "Batch requests are not allowed.",
  "data": {}
}
```