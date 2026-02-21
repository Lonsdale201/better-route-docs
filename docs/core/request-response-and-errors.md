---
title: Request, Response, and Errors
---

## Request context

`BetterRoute\Http\RequestContext` carries:

- `requestId`
- `routePath`
- original WP request object
- internal attributes (`withAttribute()`)

`requestId` comes from `x-request-id` header if present, otherwise generated.

## Response forms

Handlers may return:

- scalar/array/object (wrapped into `Response` with status `200`)
- `BetterRoute\Http\Response`
- `WP_REST_Response`
- `WP_Error` (normalized)

## Stable error envelope

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Invalid request.",
    "requestId": "req_...",
    "details": {
      "fieldErrors": {
        "title": ["required"]
      }
    }
  }
}
```

## Exception mapping

- `ApiException`: status/errorCode/details preserved
- `InvalidArgumentException`: `400` with `invalid_request`
- other throwables: `500` with `internal_error`

## Common mistakes

- Throwing generic runtime exceptions for known business errors
- Returning raw WordPress errors without consistent code/message
- Ignoring `requestId` in logs

## Validation checklist

- every error payload contains `requestId`
- business conflict uses `ConflictException` (`409`)
- precondition failures use `PreconditionFailedException` (`412`)
