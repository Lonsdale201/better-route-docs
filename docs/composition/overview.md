---
title: Composition Overview
sidebar_position: 1
---

`better-route` and `better-data` are independent libraries. Each works alone. Together — through `BetterData\Route\BetterRouteBridge` — they cover the full flow from a routed REST endpoint down to typed storage with an OpenAPI document falling out for free.

## When to use each

| Scenario | Use |
|---|---|
| You need a REST surface with versioned routes, middleware, OpenAPI export | [better-route](../better-route/intro) |
| You need typed, immutable data structures with WP-aware hydration | [better-data](../better-data/intro) |
| Both: REST endpoints whose request/response shape is a DTO | both, via [BetterRouteBridge](better-route-bridge) |

The bridge is opt-in. `better-data` doesn't take `better-route` as a hard Composer dependency — the bridge operates on duck-typed `$router` objects and only fires when both libraries are installed.

## Without the bridge — manual integration

You can use both libraries side-by-side without the bridge, at the cost of more boilerplate:

```php
use BetterRoute\BetterRoute;
use BetterRoute\Http\Response;

$router = BetterRoute::router('shop', 'v1');

$router->post('/products', function (\WP_REST_Request $req) {
    try {
        $dto = ProductDto::fromArrayValidated($req->get_json_params());
        $id = $dto->saveAsPost();
        return Response::ok($dto->with(['id' => $id])->toArray(), 201);
    } catch (\BetterData\Exception\ValidationException $e) {
        return new \WP_Error('validation_failed', 'Invalid input.', [
            'status' => 400,
            'errors' => $e->errors(),
        ]);
    }
});

$router->register();
```

This works, but you're hand-wiring:

- Hydration source (`get_json_params()` vs `get_body_params()` vs URL params)
- Validation invocation
- Exception translation
- Response shape (Presenter? envelope?)
- OpenAPI args (you'd separately call `MetaKeyRegistry::toRestArgs()` and pass to `->args()`)
- OpenAPI request/response schemas

Every endpoint repeats the same pattern.

## With the bridge — DTO drives the route

```php
use BetterData\Route\BetterRouteBridge;
use BetterRoute\BetterRoute;

$router = BetterRoute::router('shop', 'v1');

BetterRouteBridge::post(
    $router,
    '/products',
    ProductDto::class,
    fn (ProductDto $dto) => $dto->saveAsPost(),
    ['operationId' => 'productsCreate', 'tags' => ['Products']],
);

$router->register();
```

The bridge auto-wires:

| Aspect | Without bridge | With bridge |
|---|---|---|
| Hydration source | manual `fromArray()` | auto, with `source` option |
| Validation | manual `validate()` call | auto (set `validate: false` to skip) |
| Error translation | manual try/catch | auto-mapped to better-route HTTP errors |
| Response shape | manual Presenter wrapping | auto-presented via `PresentationContext::rest()` |
| `RouteBuilder::args()` | manual `MetaKeyRegistry::toRestArgs()` | auto-called; URL fields marked required |
| `RouteBuilder::meta()` | manual schema + tags + operationId | auto-generated, options merged on top |
| Permission | separate `->permission()` | via `permissionCallback` option |

## Comparison: same flow, both styles

### Without

```php
$router->put('/products/(?P<id>\d+)', function ($req) {
    try {
        $url = $req->get_url_params();
        $body = $req->get_json_params();

        if (array_key_exists('id', $body) && $body['id'] !== $url['id']) {
            return new \WP_Error('id_collision', 'id may only come from the URL', ['status' => 400]);
        }

        $payload = array_merge($body, ['id' => $url['id']]);
        $dto = ProductDto::fromArrayValidated($payload);
        $dto->saveAsPost(only: ['price', 'stock'], skipNullDeletes: true);

        return Presenter::for($dto)
            ->context(PresentationContext::rest())
            ->toArray();
    } catch (\BetterData\Exception\ValidationException $e) {
        return new \WP_Error('validation_failed', 'Invalid input.', [
            'status' => 400,
            'errors' => $e->errors(),
        ]);
    }
})
->args(MetaKeyRegistry::toRestArgs(ProductDto::class))
->meta([
    'operationId' => 'productsUpdate',
    'tags' => ['Products'],
    'requestSchema' => '#/components/schemas/Product',
    'responseSchema' => '#/components/schemas/Product',
])
->permission(fn () => current_user_can('edit_posts'));
```

### With

```php
BetterRouteBridge::patch(
    $router,
    '/products/{id}',
    ProductDto::class,
    fn (ProductDto $dto) => $dto->saveAsPost(only: ['price', 'stock'], skipNullDeletes: true),
    [
        'source' => 'json',
        'routeFields' => ['id'],
        'operationId' => 'productsUpdate',
        'tags' => ['Products'],
        'permissionCallback' => fn () => current_user_can('edit_posts'),
    ],
);
```

Same behavior, including the URL/body collision check, error translation, presentation, and OpenAPI metadata.

## What the bridge does NOT do

- **It doesn't replace `better-route`'s router.** The bridge composes with the existing builder; you can mix bridge-registered routes and hand-written `$router->post(...)` routes in the same router.
- **It doesn't take over middleware.** Use `better-route`'s middleware pipeline as usual; pass middleware classes via the `middlewares` option (or `$builder->middleware()`) — they run before the bridge's hydration.
- **It doesn't expose its own response format.** Presented arrays go straight through `better-route`'s response handling. Set `envelope: true` to wrap in `['data' => ...]` if your API convention requires it.

## Where to go next

- [BetterRouteBridge](better-route-bridge) — full options reference and worked examples
- [OpenAPI with both libraries](openapi-with-both) — merging contracts and DTO schemas in one document
