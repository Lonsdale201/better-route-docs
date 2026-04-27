---
title: BetterRouteBridge
sidebar_position: 2
---

`BetterData\Route\BetterRouteBridge` wires DTOs into a `better-route` `Router`. The DTO drives hydration, validation, REST args, OpenAPI metadata, and response shaping.

It's part of the `better-data` package; `better-route` is **not** a hard Composer dependency. The bridge operates on duck-typed `$router` objects (calls `get`/`post`/`put`/`patch`/`delete` by name), so it only fires when both libraries are installed.

## HTTP method entry points

```php
BetterRouteBridge::get($router, $uri, DtoClass::class, $handler, $options);
BetterRouteBridge::post($router, $uri, DtoClass::class, $handler, $options);
BetterRouteBridge::put($router, $uri, DtoClass::class, $handler, $options);
BetterRouteBridge::patch($router, $uri, DtoClass::class, $handler, $options);
BetterRouteBridge::delete($router, $uri, DtoClass::class, $handler, $options);
```

Returns the `RouteBuilder`-compatible object the underlying router returns, so you can keep chaining (`->args()`, `->meta()`, `->permission()`, etc.) when you want to override the bridge's defaults.

## Handler signature

```php
function (DataObject $dto, \WP_REST_Request $request): mixed
```

The bridge inspects the callable's arity and passes `($dto, $request)` or just `($dto)` accordingly. Variadic handlers receive both. Reflection failures fall back to `($dto)`-only.

The handler can return:

- A `DataObject` — the bridge presents it via `Presenter::for($result)->context(PresentationContext::rest())->toArray()`
- An array of values — recursively presented (DataObject items get the same treatment)
- A scalar — passed through unchanged
- A `WP_REST_Response` / `WP_Error` — passed through unchanged

## Options array

Every key is optional.

| Key | Type | Default | Notes |
|---|---|---|---|
| `source` | string | `'auto'` | `'auto' \| 'merged' \| 'json' \| 'body' \| 'query' \| 'url'` — which request bucket to hydrate from. `auto` picks JSON/body/query in order. |
| `routeFields` | list&lt;string&gt; | `[]` | DTO field names that are URL-owned (path params). Enforced via no-collision check; URL params merged authoritatively. |
| `validate` | bool | `true` | Run `validate()->throwIfInvalid()` after hydration |
| `envelope` | bool | `false` | Wrap handler result in `['data' => …]` |
| `args` | array \| `false` | (auto) | Override args map (passed to `$builder->args()`); `false` skips the call entirely |
| `meta` | array | `[]` | Extra better-route meta merged over generated meta |
| `permissionCallback` | callable | none | Forwarded to `$builder->permission()` |
| `middlewares` | list&lt;callable\|class-string&gt; | `[]` | Forwarded to `$builder->middleware()` |
| `operationId` | string | none | OpenAPI operation ID |
| `tags` | list&lt;string&gt; | `[SchemaName]` | OpenAPI tags |
| `scopes` | list&lt;string&gt; | `[]` | OAuth scopes for `meta.scopes` |
| `requestSchema` | string | auto | OpenAPI request schema `$ref` (e.g. `'#/components/schemas/Product'`) |
| `responseSchema` | string | auto | OpenAPI response schema `$ref` |
| `requestSchemaName` | string | derived | Override schema name when auto-generating refs |
| `responseSchemaName` | string | derived | Same for response |
| `security` | array | none | OpenAPI security requirements |
| `openapi` | array | none | Arbitrary extra OpenAPI metadata merged into `meta` |

## What the bridge does on each request

```
WP_REST_Request
   ↓
1. Resolve param source (source option: auto/json/body/query/url/merged)
   ↓
2. If routeFields set:
   - Assert listed fields are NOT in body/JSON/query
   - Merge URL params as authoritative overlay
   ↓
3. DataObject::fromArray($payload)
   ↓
4. If validate: true (default) → $dto->validate()->throwIfInvalid()
   ↓
5. Invoke user handler with ($dto, $request) — arity-aware
   ↓
6. Recursively present result:
   - DataObject → Presenter::for($r)->context(PresentationContext::rest())->toArray()
   - array → recurse on each element
   - scalar → pass through
   - WP_REST_Response / WP_Error → pass through
   ↓
7. If envelope: true → wrap in ['data' => $presented]
   ↓
8. Return value to better-route's response pipeline
```

## Exception mapping

The bridge catches the better-data exceptions inside the handler closure and translates them to better-route HTTP errors:

| Exception | Status | Code | Details |
|---|---|---|---|
| `ValidationException` | 400 | `validation_failed` | `details.fieldErrors` from `ValidationResult::errors` |
| `RequestParamCollisionException` | 400 | `request_param_collision` | (route-owned field appeared in body/query) |
| `RequestGuardException` (and subclasses) | 403 | `request_guard_failed` | (nonce / capability failure) |
| `DataObjectException` (`TypeCoercionException`, `MissingRequiredFieldException`, `UnknownFieldException`) | 400 | `validation_failed` | field name when available |

Other exceptions propagate to better-route's normal error handler (and end up as 500 unless caught upstream).

## Static utilities

For more advanced flows where you want to assemble pieces yourself:

### `BetterRouteBridge::handler($dtoClass, $handler, $options): \Closure`

Returns the wrapped handler closure without binding it to a route. Useful when you have a custom router or want to reuse the same wrapper.

### `BetterRouteBridge::hydrate($request, $dtoClass, $options): DataObject`

Runs the hydration step alone — `source` resolution, `routeFields` enforcement, `fromArray`, optional validation. Useful in non-bridge-managed routes where you want the bridge's hydration semantics.

### `BetterRouteBridge::args($dtoClass, $options): array`

Generates the `RouteBuilder::args()` map. Calls `MetaKeyRegistry::toRestArgs()` and marks `routeFields` entries as `required: true`.

### `BetterRouteBridge::meta($dtoClass, $options): array`

Generates the better-route meta dict (operationId, tags, scopes, parameters, requestSchema, responseSchema). Use to feed `$builder->meta()` directly.

### `BetterRouteBridge::openApiComponents(array $dtoClasses): array`

Returns `['schemas' => [...]]` for the OpenAPI exporter. The `$dtoClasses` array can be:

- A list of class strings (uses `BetterRouteBridge::schemaName($class)` to derive the schema key — strips a `Dto` suffix if present)
- A map `[customName => className]` for explicit naming

```php
$components = BetterRouteBridge::openApiComponents([
    'Product'        => ProductDto::class,
    'CreateProduct'  => CreateProductDto::class,
    OrderDto::class,                          // → 'Order' (Dto suffix stripped)
]);

$openapi = BetterRoute::openApiExporter()->export(
    $router->contracts(true),
    ['components' => $components],
);
```

### `BetterRouteBridge::schemaRef($dtoClass, ?$schemaName = null): string`

Returns `'#/components/schemas/<Name>'`.

### `BetterRouteBridge::schemaName($dtoClass): string`

Returns the schema name derived from the class (short class name with `Dto` suffix stripped).

### `BetterRouteBridge::parameters($dtoClass, $options): array`

Builds the OpenAPI parameter list for path and query params (used internally by `meta()`).

## Worked examples

### POST with validation, envelope, and capability check

```php
BetterRouteBridge::post(
    $router,
    '/products',
    CreateProductDto::class,
    function (CreateProductDto $dto): ProductDto {
        $id = $dto->saveAsPost();
        return ProductDto::fromPost($id);
    },
    [
        'operationId' => 'productsCreate',
        'tags' => ['Products'],
        'envelope' => true,
        'permissionCallback' => fn () => current_user_can('edit_posts'),
    ],
);
```

### PATCH with URL-authoritative ID and partial update

```php
BetterRouteBridge::patch(
    $router,
    '/products/{id}',
    ProductDto::class,
    function (ProductDto $dto): ProductDto {
        $dto->saveAsPost(only: ['price', 'stock'], skipNullDeletes: true);
        return $dto;
    },
    [
        'source' => 'json',
        'routeFields' => ['id'],
        'operationId' => 'productsUpdate',
        'tags' => ['Products'],
    ],
);
```

If a client `PATCH`es `/products/42` with `{"id": 999, "price": 24.99}`, the bridge throws `RequestParamCollisionException` → 400 `request_param_collision`. The handler never runs.

### Skip auto-args, override schema name

```php
BetterRouteBridge::post(
    $router,
    '/orders',
    OrderDto::class,
    fn (OrderDto $o) => $o->saveAsPost(),
    [
        'args' => false,                                  // skip RouteBuilder::args()
        'requestSchemaName' => 'OrderInput',              // → '#/components/schemas/OrderInput'
        'responseSchema' => '#/components/schemas/Order',
    ],
);
```

### Custom middleware in the chain

```php
BetterRouteBridge::post(
    $router,
    '/orders',
    OrderDto::class,
    fn (OrderDto $o) => $o->saveAsPost(),
    [
        'middlewares' => [
            new RateLimitMiddleware(...),
            new AuditMiddleware(...),
        ],
        'permissionCallback' => fn () => current_user_can('edit_shop_orders'),
    ],
);
```

Middleware runs before the bridge's hydration. RateLimit failures, auth rejections, etc. short-circuit before any DTO work.

## Common mistakes

- Using `routeFields: ['id']` but writing the route as `/products/{ id }` (with whitespace) — better-route's URL pattern parser is strict; match the field name exactly.
- Setting `validate: false` and forgetting to call `$dto->validate()` inside the handler when the user expects validation errors — the bridge respects the option literally.
- Returning a `WP_REST_Response` from the handler expecting the bridge to apply Presenter — `WP_REST_Response` passes through unchanged, by design. Return a `DataObject` (or array) for auto-presentation.
- Expecting `envelope: true` to apply to `WP_Error` returns — it only wraps successful results. Errors flow through better-route's error envelope.
- Combining `routeFields` with `source: 'merged'` and a body that doesn't include the URL field — fine. The bridge merges URL params authoritatively after `merged` resolution.
