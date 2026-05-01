---
title: Middleware Catalog
---

## Auth

- `JwtAuthMiddleware`
- `BearerTokenAuthMiddleware`
- `CookieNonceAuthMiddleware`
- `ApplicationPasswordAuthMiddleware`
- `WpClaimsUserMapper`
- `OwnershipGuardMiddleware` *(v0.5.0)* — route-level "current user owns this resource" guard; pairs with `OwnedResourcePolicy::currentUserOwns()` for Resource DSL

## Write safety

- `IdempotencyMiddleware` — response-replay cache (handler runs, then store writes)
- `TransientIdempotencyStore`
- `WpdbIdempotencyStore` *(v0.3.0)* — `wpdb`-backed replay store; call `installSchema()` once on activation
- `AtomicIdempotencyMiddleware` *(v0.5.0)* — reserves the key **before** handler execution; blocks concurrent retries with `409 idempotency_in_progress`
- `AtomicIdempotencyStoreInterface` *(v0.5.0)* — store contract (`reserve` / `complete` / `release`)
- `ArrayAtomicIdempotencyStore` *(v0.5.0)* — in-memory store for tests / non-production
- `WpdbAtomicIdempotencyStore` *(v0.5.0)* — `wpdb` `INSERT IGNORE` reservation store; dedicated table, `installSchema()` once on activation
- `OptimisticLockMiddleware`
- `CallbackOptimisticLockVersionResolver`

## Public-client / CORS *(v0.5.0)*

- `BetterRoute\Middleware\Cors\CorsMiddleware` — applies a `CorsPolicy`, short-circuits preflight `OPTIONS` with `204`
- `BetterRoute\Middleware\Cors\CorsPolicy` — origin allowlist, methods/headers/exposed-headers, credentials, max age
- `Router::options()` — register explicit preflight routes; `OPTIONS` permissions are public-by-default

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

- `AuditMiddleware` — *(v0.5.0)* now merges `RequestContext::$attributes['audit']` into emitted events
- `AuditEnricherMiddleware` *(v0.5.0)* — adds auth provider/user/subject, hashed idempotency key, optional client IP, and static fields to the `audit` attribute
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
