---
title: Cookie + Nonce Auth
---

Use for browser sessions in wp-admin/front-end authenticated flows.

## Minimal example

```php
use BetterRoute\Middleware\Auth\CookieNonceAuthMiddleware;

$cookieNonce = new CookieNonceAuthMiddleware(
    nonceAction: 'wp_rest',
    requireNonce: true,
    requireLoggedIn: true
);
```

Nonce sources checked in order:

1. `x-wp-nonce` header
2. `_wpnonce` request param
3. `_wpnonce` array request key

## Scenario: internal dashboard API

- Require logged-in users
- Require nonce for CSRF protection
- Pair with `permission()` capability checks

## Common mistakes

- Using wrong nonce action
- Calling without logged-in user when `requireLoggedIn=true`
- Trusting nonce without role/capability authorization

## Validation checklist

- missing/invalid nonce -> `403 invalid_nonce`
- anonymous request -> `401 unauthorized`
- auth context includes provider `cookie_nonce`
