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
- `WpdbIdempotencyStore` *(v0.3.0)* — `wpdb`-backed store; call `installSchema()` once on activation
- `OptimisticLockMiddleware`
- `CallbackOptimisticLockVersionResolver`

## Rate limiting

- `RateLimitMiddleware`
- `TransientRateLimiter`
- `WpObjectCacheRateLimiter` *(v0.3.0)* — uses the WP object cache; throws `RuntimeException` if `wp_cache_*` is unavailable

## Caching

- `CachingMiddleware`
- `TransientCacheStore`
- `ETagMiddleware` *(v0.3.0)* — emits `ETag` headers and replies `304 Not Modified` on `If-None-Match` matches (GET/HEAD only)

## HTTP infrastructure (v0.3.0)

- `BetterRoute\Http\ClientIpResolver` — resolves the real client IP behind trusted proxies. Default trusted headers: `HTTP_X_FORWARDED_FOR`, `HTTP_CF_CONNECTING_IP`, `HTTP_X_REAL_IP`. If `REMOTE_ADDR` is not in `$trustedProxies`, headers are ignored.

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

## Default keys (v0.3.0)

`CachingMiddleware`, `IdempotencyMiddleware`, and `RateLimitMiddleware` derive default keys from request identity:

- `auth.userId > 0` → `"{provider}:user:{userId}"`
- `auth.subject` (non-empty) → `"{provider}:sub:{subject}"`
- `RateLimitMiddleware` only: client IP fallback → `"ip:{clientIp}"`
- otherwise → `"guest"`

If you previously relied on the v0.2.0 route-only defaults, expect a one-time cache miss after upgrade. Pass an explicit `keyResolver` to keep keys stable.
