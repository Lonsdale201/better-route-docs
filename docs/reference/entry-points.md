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
$document = $exporter->export($contracts, ['version' => 'v0.3.0']);
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

The released Composer tag is `v0.3.0`.

`BetterRoute\Support\Version::VERSION` is the in-source marker; treat the Composer tag as the source of truth and align documentation against `v0.3.0` behavior.
