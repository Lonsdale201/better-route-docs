---
title: AI Agent Skills
sidebar_position: 99
---

This page defines structured skills an AI agent needs to work effectively with the `better-route` library. Each skill describes a specific capability, when to use it, and the exact steps or API surface involved.

## Skill: Register WooCommerce routes

**When:** The user wants to expose WooCommerce data (orders, products, customers, coupons) via REST API.

**Steps:**
1. Ensure WooCommerce is active on the target WordPress site.
2. Call `BetterRoute::wooRouteRegistrar()->register('vendor/v1', $options)` inside a `rest_api_init` action hook.
3. The `$options` array controls: `basePath`, `requireHpos`, `defaultPerPage`, `maxPerPage`, `permissions`, `actions`, `idempotency`.
4. To expose only specific resources or actions, use the `actions` key (e.g. `'orders' => ['list', 'get']`).

**Example:**
```php
add_action('rest_api_init', function () {
    \BetterRoute\BetterRoute::wooRouteRegistrar()
        ->register('myapp/v1', [
            'basePath'    => '/shop',
            'requireHpos' => true,
            'actions'     => [
                'products' => ['list', 'get'],
                'orders'   => ['list', 'get', 'create', 'update'],
            ],
        ]);
});
```

---

## Skill: Register custom REST routes

**When:** The user wants to create custom REST endpoints (non-WooCommerce).

**Steps:**
1. Create a `Router` via `BetterRoute::router('vendor', 'v1')`.
2. Use `->get()`, `->post()`, `->put()`, `->patch()`, `->delete()` to define routes.
3. Each route accepts a path, a callback, and optional metadata array.
4. Register inside a `rest_api_init` action hook.

**Example:**
```php
add_action('rest_api_init', function () {
    $router = \BetterRoute\BetterRoute::router('myapp', 'v1');

    $router->get('/ping', function ($context) {
        return \BetterRoute\Http\Response::ok(['pong' => true]);
    });

    $router->register();
});
```

---

## Skill: Create a CPT resource

**When:** The user wants CRUD endpoints for a custom post type.

**Steps:**
1. Use `Resource::cpt('post_type')` to create a CPT resource.
2. Chain field definitions, query parameters, and middleware.
3. Call `->register($router)` to wire it into a router.

**Example:**
```php
use BetterRoute\Resource\Resource;

$resource = Resource::cpt('book')
    ->fields(['id', 'title', 'status', 'content', 'meta'])
    ->allowedStatuses(['publish', 'draft'])
    ->register($router);
```

---

## Skill: Add authentication middleware

**When:** The user wants to protect endpoints with authentication.

**Available middleware:**
- `JwtAuthMiddleware` — validates Bearer JWT tokens (HS256)
- `ApplicationPasswordAuthMiddleware` — validates WordPress application passwords
- `BearerTokenAuthMiddleware` — validates custom bearer tokens via callback
- `CookieNonceAuthMiddleware` — validates WordPress cookie + nonce (for logged-in users)

**Example (JWT):**
```php
use BetterRoute\Middleware\Jwt\JwtAuthMiddleware;
use BetterRoute\Middleware\Jwt\Hs256JwtVerifier;

$jwt = new JwtAuthMiddleware(
    new Hs256JwtVerifier('your-secret-key')
);

$router->group('/protected', function ($group) {
    $group->get('/me', fn($ctx) => Response::ok($ctx->user));
})->middleware($jwt);
```

---

## Skill: Export OpenAPI document

**When:** The user wants to generate an OpenAPI 3.1.0 JSON schema for their API.

**Steps:**
1. Collect contracts from the router via `$router->contracts()`.
2. Call `BetterRoute::openApiExporter()->export($contracts, $options)`.
3. Optionally merge WooCommerce component schemas via `BetterRoute::wooOpenApiComponents()`.

**Example:**
```php
$exporter = \BetterRoute\BetterRoute::openApiExporter();
$contracts = $router->contracts();

$document = $exporter->export($contracts, [
    'title'      => 'My API',
    'version'    => '1.0.0',
    'components' => \BetterRoute\BetterRoute::wooOpenApiComponents(),
    'securitySchemes' => [
        'bearerAuth' => [
            'type'         => 'http',
            'scheme'       => 'bearer',
            'bearerFormat' => 'JWT',
        ],
    ],
    'globalSecurity' => [
        ['bearerAuth' => []],
    ],
]);

// Serve as endpoint or write to file
header('Content-Type: application/json');
echo json_encode($document, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
```

---

## Skill: Configure idempotency on write endpoints

**When:** The user wants to prevent duplicate writes (double-submit protection).

**How it works:**
- Client sends `Idempotency-Key: <unique-key>` header with POST/PUT/PATCH requests.
- If the same key was seen within the TTL, the cached response is returned without re-executing the handler.

**Example:**
```php
$router = \BetterRoute\BetterRoute::wooRouteRegistrar()
    ->register('myapp/v1', [
        'idempotency' => [
            'enabled'    => true,
            'requireKey' => true,
            'ttlSeconds' => 600,
        ],
    ]);
```

---

## Skill: Query WooCommerce list endpoints

**When:** The user or agent needs to retrieve filtered, paginated lists from WooCommerce endpoints.

**Common patterns:**

```
GET /wp-json/vendor/v1/woo/orders?status=processing&sort=-date_created&page=1&per_page=50
GET /wp-json/vendor/v1/woo/products?type=simple&stock_status=instock&fields=id,name,price
GET /wp-json/vendor/v1/woo/customers?role=customer&search=john&sort=email
GET /wp-json/vendor/v1/woo/coupons?code=SUMMER25&fields=id,code,amount,discount_type
```

**Rules:**
- Unknown query parameters return `400`.
- `fields` is always comma-separated.
- Sort prefix `-` means DESC, no prefix means ASC.
- `per_page` is capped at the configured `maxPerPage` (default 100).
- Pagination headers: `X-WP-Total`, `X-WP-TotalPages`.

---

## Skill: Handle metadata

**When:** The user needs to read or write custom metadata on WooCommerce entities.

**Format:**
```json
{
  "meta_data": [
    { "key": "custom_field", "value": "custom_value" },
    { "key": "another_field", "value": 42 }
  ]
}
```

**Rules:**
- `key` must be a non-empty string.
- `value` can be any JSON-serializable type.
- On update, `meta_data` entries are applied via `update_meta_data()` — existing keys are overwritten, new keys are added.
- Metadata in responses includes an `id` field (the meta entry ID).

---

## Skill: Understand the error contract

**When:** The agent needs to interpret or handle API errors.

**Every error response follows this envelope:**
```json
{
  "code": "error_code",
  "message": "Human-readable message",
  "status": 400,
  "requestId": "unique-request-id",
  "data": {}
}
```

**Common error codes:**
- `400` — validation error, unknown parameters, missing required fields
- `401` — authentication required
- `403` — insufficient permissions
- `404` — resource not found
- `409` — conflict (e.g. `hpos_required`, duplicate email)
- `503` — WooCommerce unavailable (`woo_unavailable`)
