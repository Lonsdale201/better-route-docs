---
title: Application Password Auth
---

Use HTTP Basic credentials backed by WordPress Application Passwords.

## Minimal example

```php
use BetterRoute\Middleware\Auth\ApplicationPasswordAuthMiddleware;

$appPassword = new ApplicationPasswordAuthMiddleware();
```

Expected header format:

`Authorization: Basic base64(username:application_password)`

## Behavior

- Invalid/missing Authorization header -> `401`
- Invalid credentials -> `401 invalid_credentials`
- On success, current WP user is set via `wp_set_current_user`

## Scenario: machine-to-machine integration

- API client stores app password credential
- middleware authenticates and sets user context
- route permission enforces capability scopes

## Common mistakes

- Sending Bearer token to this middleware
- Invalid base64 or missing `username:password` separator
- Forgetting to keep credentials per integration identity

## Validation checklist

- successful auth sets `auth.provider=application_password`
- invalid header returns deterministic error code
- least-privilege user is used for app password
