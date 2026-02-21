---
title: Audit
---

`AuditMiddleware` emits structured audit events around each request.

## Minimal example

```php
use BetterRoute\Middleware\Audit\AuditMiddleware;
use BetterRoute\Middleware\Audit\ErrorLogAuditLogger;

$audit = new AuditMiddleware(
    logger: new ErrorLogAuditLogger()
);
```

## Event schema highlights

Produced by `AuditEventFactory`:

- `event` (`http_request`)
- `timestamp`
- `requestId` and `traceId`
- `route`, `method`
- `outcome` (`success|error`)
- `statusCode`
- `errorCode` and `error` message (on failure)
- `durationMs`
- compatibility alias: `status` (`ok|error`)

## Scenario: audit trail for regulated writes

- attach middleware to sensitive route group
- feed events into SIEM/log pipeline
- correlate by `requestId`

## Common mistakes

- Logging only failures (lose baseline)
- Not preserving request IDs between systems
- Writing unstructured free-text events

## Validation checklist

- both success and error flows emit events
- duration is captured in milliseconds
- event payload is JSON serializable
