---
title: Middleware Pipeline
---

Pipeline execution is deterministic and test-backed.

## Order guarantee

Execution order is:

1. global middleware
2. group middleware
3. route middleware
4. handler

## Accepted middleware forms

- class implementing `BetterRoute\Middleware\MiddlewareInterface`
- callable `(RequestContext $context, callable $next): mixed`
- class-string resolvable via `middlewareFactory` or zero-arg constructor

## Short-circuit behavior

A middleware may return early and skip downstream calls. This is used for:

- auth rejection
- cached response replay
- rate-limit rejection

## Factory-based resolution example

```php
$router->middlewareFactory(function (string $class): mixed {
    if ($class === JwtAuthMiddleware::class) {
        return new JwtAuthMiddleware($verifier, ['content:*'], new WpClaimsUserMapper());
    }

    return null;
});
```

## Common mistakes

- Returning non-callable from factory
- Not handling constructor dependencies for class-string middleware
- Mutating context without returning `$next($newContext)`

## Validation checklist

- middleware with ctor args is resolved by factory
- short-circuit does not execute handler
- thrown exceptions are normalized to error envelope
