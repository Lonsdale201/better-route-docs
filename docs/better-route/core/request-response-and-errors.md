---
title: Request, Response, and Errors
---

## Request context

`BetterRoute\Http\RequestContext` carries:

- `requestId`
- `routePath`
- original WP request object
- internal attributes (`withAttribute()`)

`requestId` comes from the `x-request-id` header if it matches `^[A-Za-z0-9._:-]{1,128}$` *(sanitized in v0.3.0)*; otherwise a fresh id is generated.

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
- `InvalidArgumentException`: `400` with `invalid_request`; `details.exception` includes the class name (developer aid)
- other throwables: `500` with `internal_error`; **message normalized to `"Unexpected error."`** and `details` is empty *(v0.3.0)* — internal exception class and message no longer leak

## OAuth error format *(v0.6.0)*

Routes that wrap an OAuth surface can opt out of the default envelope per route:

```php
$router->post('/oauth/token', $handler)
    ->meta(['error_format' => 'oauth_rfc6749'])
    ->publicRoute();
```

Errors on those routes use the RFC 6749 shape (`{ "error": ..., "error_description": ... }`) instead. Every other route on the same router keeps the default envelope. See [OAuth Error Format](../public-client/oauth-error-format).

## Common mistakes

- Throwing generic runtime exceptions for known business errors
- Returning raw WordPress errors without consistent code/message
- Ignoring `requestId` in logs

## Validation checklist

- every error payload contains `requestId`
- business conflict uses `ConflictException` (`409`)
- precondition failures use `PreconditionFailedException` (`412`)
