---
title: Auth Overview
---

Built-in auth middleware provides bridge patterns for WordPress REST routes.

## Available middleware

- `BetterRoute\Middleware\Jwt\JwtAuthMiddleware`
- `BetterRoute\Middleware\Auth\BearerTokenAuthMiddleware`
- `BetterRoute\Middleware\Auth\CookieNonceAuthMiddleware`
- `BetterRoute\Middleware\Auth\ApplicationPasswordAuthMiddleware`
- `BetterRoute\Middleware\Auth\WpClaimsUserMapper`

## Context propagation

On success, middleware writes auth context attributes:

- `auth` (provider, userId, subject, scopes)
- optionally `claims`, `userId`, `user`, `scopes`

## Important policy note

Even with auth middleware, route registration still requires explicit `permission_callback` (by design in dispatcher integration).

## v0.3.0 hardening

- `Hs256JwtVerifier` requires `exp` by default and supports `expectedIssuer`, `expectedAudience`, `maxLifetimeSeconds`, and `maxTokenLength`. See [JWT and Bearer](jwt-bearer).
- `WpClaimsUserMapper` removed `'sub'` from default `idClaims` — re-add it explicitly when needed.
- `BearerTokenAuthMiddleware` no longer leaks the verifier exception message; failed tokens uniformly return `401 invalid_token` with no `details.reason`.

## Common mistakes

- Relying on middleware alone without route permissions
- Missing `Authorization` header normalization
- Not mapping JWT/Bearer claims to WP user where needed

## Validation checklist

- `401` on missing/invalid credential
- `403` on missing required scopes
- expected auth attributes exist in `RequestContext`
