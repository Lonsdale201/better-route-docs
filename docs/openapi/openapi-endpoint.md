---
title: openapi.json Endpoint
---

Use `OpenApiRouteRegistrar` to expose API docs as REST endpoint.

## Minimal example

```php
use BetterRoute\OpenApi\OpenApiRouteRegistrar;

OpenApiRouteRegistrar::register(
    restNamespace: 'better-route/v1',
    contractsProvider: static fn (): array => OpenApiRouteRegistrar::contractsFromSources([
        $router,
        $articlesResource,
    ]),
    options: [
        'title' => 'better-route API',
        'version' => 'v0.1.0',
        'serverUrl' => '/wp-json',
        'permissionCallback' => static fn (): bool => true,
    ]
);
```

Endpoint result:

- `GET /wp-json/better-route/v1/openapi.json`

## contractsFromSources()

Accepts:

- `Router`
- `Resource`
- raw list of contract arrays

## Common mistakes

- invalid `restNamespace` format (must be `<vendor>/<version>`)
- non-callable `permissionCallback`
- `contractsProvider` not returning an array

## Validation checklist

- endpoint route meta uses `openapi.include=false`
- permission callback behavior matches exposure policy
- response document contains expected paths
