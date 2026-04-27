---
title: OpenAPI with Both Libraries
sidebar_position: 3
---

`better-route` exports OpenAPI 3.1 documents from router/resource contracts. `better-data` derives JSON Schemas from DTOs. Together they produce a single document where every endpoint references typed DTO components.

## The pattern

```php
use BetterData\Route\BetterRouteBridge;
use BetterRoute\BetterRoute;

add_action('rest_api_init', function (): void {
    $router = BetterRoute::router('shop', 'v1');

    BetterRouteBridge::post(
        $router,
        '/products',
        CreateProductDto::class,
        fn (CreateProductDto $dto) => ProductDto::fromPost($dto->saveAsPost()),
        [
            'operationId' => 'productsCreate',
            'tags' => ['Products'],
            'requestSchema' => '#/components/schemas/CreateProduct',
            'responseSchema' => '#/components/schemas/Product',
        ],
    );

    BetterRouteBridge::get(
        $router,
        '/products/{id}',
        ProductDto::class,
        fn (ProductDto $dto) => $dto,
        [
            'operationId' => 'productsGet',
            'tags' => ['Products'],
            'routeFields' => ['id'],
            'responseSchema' => '#/components/schemas/Product',
        ],
    );

    $router->register();

    \BetterRoute\OpenApi\OpenApiRouteRegistrar::register(
        restNamespace: 'shop/v1',
        contractsProvider: static fn (): array => $router->contracts(openApiOnly: true),
        options: [
            'title' => 'Shop API',
            'version' => 'v1.0.0',
            'serverUrl' => '/wp-json',
            'components' => BetterRouteBridge::openApiComponents([
                'Product'        => ProductDto::class,
                'CreateProduct'  => CreateProductDto::class,
            ]),
            'permissionCallback' => fn () => true,  // override v0.3.0 admin-only default
        ],
    );
});
```

Endpoint: `GET /wp-json/shop/v1/openapi.json` returns the merged document.

## Component generation

`BetterRouteBridge::openApiComponents()` calls `MetaKeyRegistry::toJsonSchema()` for each DTO and assembles a `['schemas' => [name => schema]]` map.

The argument can be:

- **List of FQNs** — names auto-derived (`Dto` suffix stripped):
  ```php
  BetterRouteBridge::openApiComponents([
      ProductDto::class,        // → 'Product'
      CreateProductDto::class,  // → 'CreateProduct'
      OrderDto::class,           // → 'Order'
  ]);
  ```

- **Map customName => FQN** — explicit naming:
  ```php
  BetterRouteBridge::openApiComponents([
      'ProductRead'   => ProductDto::class,
      'ProductCreate' => CreateProductDto::class,
      'ProductUpdate' => UpdateProductDto::class,
  ]);
  ```

Mix both styles in one call — the array is iterated; numeric keys use auto-derivation, string keys use the literal name.

## Schema refs in route options

The bridge auto-generates `requestSchema` and `responseSchema` refs based on the handler signature when not specified:

```php
BetterRouteBridge::post(
    $router,
    '/products',
    CreateProductDto::class,
    fn (CreateProductDto $dto) => ProductDto::fromPost($dto->saveAsPost()),
);
// requestSchema  → '#/components/schemas/CreateProduct'
// responseSchema → '#/components/schemas/Product' (inferred from handler return type)
```

When the handler return type isn't reflectable (closure with `mixed` return), the bridge omits `responseSchema`. Specify it manually with `responseSchema` or `responseSchemaName`:

```php
['responseSchema' => '#/components/schemas/Product']
```

## Mixing better-route resources and better-data DTOs

A single OpenAPI document can include:

- Routes from `Router` (better-route's regular `$router->get/post/...`)
- Routes from `Resource` DSL (CPT / table — better-route's `Resource::make(...)->register()`)
- Routes wired through `BetterRouteBridge` (DTO-driven)
- WooCommerce routes from `WooRouteRegistrar`

Merge their components into one document:

```php
$components = array_merge_recursive(
    BetterRoute::wooOpenApiComponents(),
    BetterRouteBridge::openApiComponents([
        ProductDto::class,
        OrderDto::class,
    ]),
);

OpenApiRouteRegistrar::register(
    restNamespace: 'shop/v1',
    contractsProvider: static fn (): array => $router->contracts(openApiOnly: true),
    options: [
        'title' => 'Shop API',
        'version' => 'v1.0.0',
        'components' => $components,
    ],
);
```

`array_merge_recursive` preserves entries from both sides; if a key collides (e.g., both libs define a `Product` schema), the better-data one wins because it's later in the merge order. Use unique component names to avoid this.

## strictSchemas

`OpenApiExporter`'s `strictSchemas: true` mode (since better-route v0.3.0) throws `InvalidArgumentException` if any `$ref` points to a missing schema. Combined with the bridge's auto-generated refs, this catches the case where you forgot to add a DTO to `openApiComponents()`:

```php
$openapi = BetterRoute::openApiExporter()->export(
    $contracts,
    [
        'strictSchemas' => true,
        'components' => BetterRouteBridge::openApiComponents([
            ProductDto::class,
            // CreateProductDto missing → exporter throws on the route that refs it
        ]),
    ],
);
```

In CI, run a smoke that exports the doc with `strictSchemas: true`. The throw catches DTO-vs-route drift early.

## Securing the OpenAPI endpoint

Since better-route v0.3.0, `OpenApiRouteRegistrar::register()` defaults to `current_user_can('manage_options')` — admin-only. Most public APIs want the doc accessible to API consumers; pass `permissionCallback` to override:

```php
options: [
    // ...
    'permissionCallback' => fn () => true,  // public
    // OR
    'permissionCallback' => fn () => current_user_can('read'),  // any logged-in user
]
```

See [better-route OpenAPI endpoint](../better-route/openapi/openapi-endpoint) for the full options.

## Common mistakes

- Forgetting to add a DTO to `openApiComponents()` — the route references `#/components/schemas/Foo` but the schema isn't defined; clients get a permissive `additionalProperties: true` placeholder. Use `strictSchemas: true` in CI to catch this.
- Using auto-derived names that collide (two DTOs both deriving `'Product'`) — name them explicitly via the map form.
- Mixing `array_merge_recursive` with WC components — works, but be aware that schema-key collisions silently merge values; pick unique names per layer.
- Expecting the bridge's `responseSchema` auto-detection to work for closures that don't declare a return type — declare `: ProductDto` or pass `responseSchema` explicitly.
