---
title: OpenAPI Exporter
---

`BetterRoute\OpenApi\OpenApiExporter::export(array $contracts, array $options = []): array`

## Minimal example

```php
use BetterRoute\OpenApi\OpenApiExporter;

$contracts = array_merge(
    $router->contracts(true),
    $resource->contracts(true)
);

$document = (new OpenApiExporter())->export($contracts, [
    'title' => 'better-route API',
    'version' => 'v0.1.0',
    'description' => 'Contract-first API',
    'serverUrl' => '/wp-json',
    'openapiVersion' => '3.1.0',
    'components' => [
        'schemas' => [
            'Article' => ['type' => 'object'],
        ],
    ],
]);
```

## Export options

- `title`
- `version`
- `description`
- `serverUrl`
- `openapiVersion`
- `includeExcluded`
- `components`

## Important behavior

- Path regex placeholders `(?P<id>...)` convert to `{id}`
- Path params are forced `required=true`
- Unsupported HTTP methods are skipped
- `default` response references `#/components/responses/ErrorResponse`

## Common mistakes

- forgetting `openapi.include=false` for internal ops
- using invalid `parameters` structure
- referencing non-existent schemas

## Validation checklist

- generated document has `openapi`, `info`, `servers`, `paths`, `components`
- expected operations include `x-scopes` and `x-better-route` extensions
- POST routes emit `201` success response
