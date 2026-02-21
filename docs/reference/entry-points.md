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
$document = $exporter->export($contracts, ['version' => 'v0.1.0']);
```

## Version marker

`BetterRoute\Support\Version::VERSION` currently returns `0.1.0-dev`.

Recommended docs positioning: baseline `v0.1.0` behavior with dev suffix awareness.
