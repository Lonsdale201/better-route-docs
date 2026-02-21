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

## Common mistakes

- Relying on middleware alone without route permissions
- Missing `Authorization` header normalization
- Not mapping JWT/Bearer claims to WP user where needed

## Validation checklist

- `401` on missing/invalid credential
- `403` on missing required scopes
- expected auth attributes exist in `RequestContext`
