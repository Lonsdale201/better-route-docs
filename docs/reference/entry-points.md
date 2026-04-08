---
title: Entry Points
---

## BetterRoute facade

### `BetterRoute::router(string $vendor, string $version): Router`

Usage:

```php
use BetterRoute\BetterRoute;

$router = BetterRoute::router('better-route', 'v1');
```

### `BetterRoute::openApiExporter(): OpenApiExporter`

Usage:

```php
$exporter = BetterRoute::openApiExporter();
$document = $exporter->export($contracts, ['version' => 'v0.2.0']);
```

### `BetterRoute::wooRouteRegistrar(): WooRouteRegistrar`

Usage:

```php
$router = BetterRoute::wooRouteRegistrar()
    ->register('myapp/v1');
```

### `BetterRoute::wooOpenApiComponents(): array`

Returns pre-built OpenAPI component schemas for all WooCommerce resources.

```php
$components = BetterRoute::wooOpenApiComponents();
```

## Version marker

`BetterRoute\Support\Version::VERSION` currently returns `0.2.0`.

Recommended docs positioning: baseline `v0.2.0` behavior.
