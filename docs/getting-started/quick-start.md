---
title: Quick Start
---

## Minimal router

```php
use BetterRoute\Router\Router;

add_action('rest_api_init', function (): void {
    Router::make('better-route', 'v1')
        ->get('/ping', fn (): array => ['pong' => true])
        ->meta([
            'operationId' => 'systemPing',
            'tags' => ['System'],
        ])
        ->permission(static fn (): bool => true)
    ;
});
```

Result:

- namespace: `better-route/v1`
- endpoint: `GET /wp-json/better-route/v1/ping`

## Minimal resource (CPT)

```php
use BetterRoute\Resource\Resource;

add_action('rest_api_init', function (): void {
    Resource::make('articles')
        ->restNamespace('better-route/v1')
        ->sourceCpt('post')
        ->allow(['list', 'get'])
        ->fields(['id', 'title', 'slug', 'date'])
        ->filters(['status'])
        ->sort(['date', 'id'])
        ->register();
});
```

## Minimal OpenAPI export endpoint

```php
use BetterRoute\OpenApi\OpenApiRouteRegistrar;

OpenApiRouteRegistrar::register(
    restNamespace: 'better-route/v1',
    contractsProvider: static fn (): array => [
        // typically merge router/resource contracts here
    ],
    options: [
        'title' => 'better-route API',
        'version' => 'v0.1.0',
        'serverUrl' => '/wp-json',
    ]
);
```

## Common mistakes

- Forgetting `->register()` on router/resource
- Defining `restNamespace` without vendor/version format (`vendor/v1`)
- Assuming middleware auth replaces `permission_callback` (it does not)

## Validation checklist

- endpoint responds under `/wp-json/...`
- error payload includes `requestId`
- unknown query params fail with `400` on resource list routes
