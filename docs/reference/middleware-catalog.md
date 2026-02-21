---
title: Middleware Catalog
---

## Auth

- `JwtAuthMiddleware`
- `BearerTokenAuthMiddleware`
- `CookieNonceAuthMiddleware`
- `ApplicationPasswordAuthMiddleware`
- `WpClaimsUserMapper`

## Write safety

- `IdempotencyMiddleware`
- `TransientIdempotencyStore`
- `OptimisticLockMiddleware`
- `CallbackOptimisticLockVersionResolver`

## Rate limiting

- `RateLimitMiddleware`
- `TransientRateLimiter`

## Caching

- `CachingMiddleware`
- `TransientCacheStore`

## Observability

- `AuditMiddleware`
- `ErrorLogAuditLogger`
- `MetricsMiddleware`
- `InMemoryMetricSink`
- `PrometheusMetricSink`
- `AuditEventFactory`

## Typical global stack

```php
$router->middleware([
    new MetricsMiddleware(new PrometheusMetricSink()),
    new AuditMiddleware(new ErrorLogAuditLogger()),
    new RateLimitMiddleware(new TransientRateLimiter(), limit: 100, windowSeconds: 60),
]);
```

Order recommendation:

1. Metrics/Audit (outer visibility)
2. Rate limit/auth
3. Cache/idempotency/optimistic lock
4. business handler
