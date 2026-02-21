---
title: Idempotency
---

`IdempotencyMiddleware` protects write endpoints from duplicate processing.

## Minimal example

```php
use BetterRoute\Middleware\Write\IdempotencyMiddleware;
use BetterRoute\Middleware\Write\TransientIdempotencyStore;

$idempotency = new IdempotencyMiddleware(
    store: new TransientIdempotencyStore(),
    ttlSeconds: 300,
    requireKey: true,
    methods: ['POST', 'PATCH']
);
```

## How it works

- reads `Idempotency-Key` header
- builds store key from route + idempotency key
- hashes request fingerprint (method + route + params/body/json)
- on replay with same fingerprint: returns cached response
- on replay with different fingerprint: `409 idempotency_conflict`

Replayed `Response` gets header:

`Idempotency-Replayed: true`

## Scenario: payment/order create endpoint

- Require idempotency key for `POST /orders`
- TTL aligned to client retry window
- Combine with optimistic locking for updates

## Common mistakes

- Setting `requireKey=false` on critical writes
- Reusing same key across different payloads intentionally
- Too short TTL for real retry behavior

## Validation checklist

- second identical request does not call handler
- conflicting payload returns `409`
- replayed response has marker header
