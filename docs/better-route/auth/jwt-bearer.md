---
title: JWT and Bearer
---

## JWT with HS256 verifier

```php
use BetterRoute\Middleware\Jwt\Hs256JwtVerifier;
use BetterRoute\Middleware\Jwt\JwtAuthMiddleware;
use BetterRoute\Middleware\Auth\WpClaimsUserMapper;

$verifier = new Hs256JwtVerifier(
    secret: $_ENV['JWT_SECRET'],
    leewaySeconds: 30,
    expectedIssuer: 'https://issuer.example.com',
    expectedAudience: 'myapp',
    requireExpiration: true,        // v0.3.0 default — set false to allow tokens without `exp`
    maxLifetimeSeconds: 3600,       // optional cap on `exp - iat`
    maxTokenLength: 8192             // v0.3.0 default
);

$jwtMiddleware = new JwtAuthMiddleware(
    verifier: $verifier,
    requiredScopes: ['content:*'],
    userMapper: new WpClaimsUserMapper()
);
```

### v0.3.0 hardening

`Hs256JwtVerifier` now enforces (defaults in parentheses):

- **`exp` required** by default (`requireExpiration: true`). Tokens without `exp` are rejected unless explicitly disabled.
- **`expectedIssuer` / `expectedAudience`** for strict `iss` / `aud` validation when set. `aud` matches against either a string or a list of audiences in the token.
- **`maxLifetimeSeconds`** rejects tokens whose `exp - iat` exceeds the cap.
- **`maxTokenLength`** (`8192` bytes) rejects oversized tokens before parsing.

`WpClaimsUserMapper` defaults changed: `idClaims` is now `['user_id', 'uid', 'wp_user_id']`. Re-add `'sub'` explicitly if your tokens use it as the WP user identifier.

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
- *(v0.3.0)* issuing tokens without `exp` while `requireExpiration` is on
- *(v0.3.0)* relying on `sub` for WP user mapping without re-adding it to `WpClaimsUserMapper::$idClaims`

## Validation checklist

- malformed token -> `401 invalid_token`
- scope mismatch -> `403 insufficient_scope`
- mapped WP user is set when mapper resolves userId
