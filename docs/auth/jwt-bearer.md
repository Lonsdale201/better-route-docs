---
title: JWT and Bearer
---

## JWT with HS256 verifier

```php
use BetterRoute\Middleware\Jwt\Hs256JwtVerifier;
use BetterRoute\Middleware\Jwt\JwtAuthMiddleware;
use BetterRoute\Middleware\Auth\WpClaimsUserMapper;

$verifier = new Hs256JwtVerifier($_ENV['JWT_SECRET'], leewaySeconds: 30);

$jwtMiddleware = new JwtAuthMiddleware(
    verifier: $verifier,
    requiredScopes: ['content:*'],
    userMapper: new WpClaimsUserMapper()
);
```

## Bearer middleware with custom verifier

```php
use BetterRoute\Middleware\Auth\BearerTokenAuthMiddleware;

$bearer = new BearerTokenAuthMiddleware(
    verifier: $customVerifier,
    requiredScopes: ['api:read'],
    userMapper: new WpClaimsUserMapper(),
    provider: 'partner_bearer'
);
```

## Scope matching

Wildcard matching is supported both ways:

- required `content:*` matches granted `content:read`
- required `content:read` matches granted `content:*`

## Common mistakes

- Empty JWT secret
- Using non-HS256 token with `Hs256JwtVerifier`
- Expecting scopes from unsupported claim shape

## Validation checklist

- malformed token -> `401 invalid_token`
- scope mismatch -> `403 insufficient_scope`
- mapped WP user is set when mapper resolves userId
