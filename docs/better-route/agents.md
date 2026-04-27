---
title: AI Agent Skills
sidebar_position: 99
---

This page defines structured skills an AI agent needs to work effectively with the `better-route` library. Each skill describes a specific capability, when to use it, and the exact steps or API surface involved.

Aligned with the **v0.3.0** release. See [Release Notes — v0.3.0](release-notes/v0.3.0) for the full changelog.

## Skill: Install better-route

**When:** The user wants to add `better-route` to a WordPress project.

**Requirements:**
- PHP `^8.1`
- WordPress with REST API (`rest_api_init` hook)
- Composer

**Steps:**
1. The package is not on Packagist yet. It must be installed via VCS repository pointing to GitHub.
2. Add the repository and require the package in `composer.json`.
3. Run `composer install` or `composer update`.

**composer.json:**
```json
{
  "require": {
    "better-route/better-route": "^0.3.0"
  },
  "repositories": [
    {
      "type": "vcs",
      "url": "https://github.com/Lonsdale201/better-route"
    }
  ],
  "prefer-stable": true
}
```

**Verification:**
```bash
composer show better-route/better-route
```

**Rules:**
- The `repositories` block is required until the package is published on Packagist.
- All route registration must happen inside a `rest_api_init` action hook.
- Available quality commands: `composer test`, `composer analyse`, `composer cs-check` (run via `php vendor/bin/...` since v0.3.0).

---

## Skill: Migrate a project to v0.3.0

**When:** The user is upgrading from v0.2.0 (or earlier) to v0.3.0.

**Steps:**
1. Bump the constraint to `^0.3.0` and run `composer update better-route/better-route`.
2. Audit the project against the v0.3.0 breaking change checklist:

| Area | Action required |
|---|---|
| **OpenAPI doc endpoint** | Now defaults to `manage_options`. If the doc must stay public, pass `'permissionCallback' => static fn (): bool => true`. |
| **Custom table resources** | Now deny-by-default. Add `->policy(ResourcePolicy::publicReadPrivateWrite())` (or another preset) to keep them reachable. |
| **JWT** | `exp` claim is now required by default. Either ensure tokens carry `exp`, or pass `requireExpiration: false` to `Hs256JwtVerifier`. |
| **`WpClaimsUserMapper`** | `sub` is no longer in default `idClaims`. Re-add it explicitly if your tokens rely on it. |
| **Woo customers** | Endpoints are restricted to users with the `customer` role; create/update/delete require `create_users` / `edit_user` / `delete_user`. |
| **Woo meta keys** | Keys starting with `_` are no longer writable or returned. Pass `$allowProtected = true` only when intentional. |
| **Default cache/idempotency/rate-limit keys** | Now identity-aware. If you relied on the old defaults, pass an explicit `keyResolver` to preserve keys. |

**Verification:**
- All endpoints that should be reachable still respond `200`.
- Auth flows still issue tokens with `exp` and roles compatible with the new restrictions.
- OpenAPI doc visibility matches your intent.

---

## Skill: Register WooCommerce routes

**When:** The user wants to expose WooCommerce data (orders, products, customers, coupons) via REST API.

**Steps:**
1. Ensure WooCommerce is active on the target WordPress site.
2. Call `BetterRoute::wooRouteRegistrar()->register('vendor/v1', $options)` inside a `rest_api_init` action hook.
3. The `$options` array controls: `basePath`, `requireHpos`, `defaultPerPage`, `maxPerPage`, `permissions`, `actions`, `idempotency`, `deleteMode`.
4. To expose only specific resources or actions, use the `actions` key (e.g. `'orders' => ['list', 'get']`).

**Example:**
```php
add_action('rest_api_init', function () {
    \BetterRoute\BetterRoute::wooRouteRegistrar()
        ->register('myapp/v1', [
            'basePath'    => '/shop',
            'requireHpos' => true,
            'deleteMode'  => 'trash', // or 'force' (default)
            'actions'     => [
                'products' => ['list', 'get'],
                'orders'   => ['list', 'get', 'create', 'update', 'delete'],
            ],
            'permissions' => [
                'orders.create' => 'manage_woocommerce',
                'orders.delete' => 'manage_woocommerce',
            ],
        ]);
});
```

**Rules (v0.3.0):**
- Customer endpoints reject users without the `customer` role.
- Customer create/update/delete additionally require `create_users` / `edit_user` / `delete_user`.
- Meta keys starting with `_` are not returned and not writable unless the caller explicitly opts in via `$allowProtected = true`.

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

**Rules (v0.3.0):**
- Route handlers receive `id` from the URL route parameters first; query/body `id` is only consulted if the URL does not provide one.
- Inbound `X-Request-ID` is accepted only if it matches `^[A-Za-z0-9._:-]{1,128}$`; otherwise a fresh id is generated.

---

## Skill: Create a CPT resource

**When:** The user wants CRUD endpoints for a custom post type.

**Steps:**
1. Use `Resource::make('name')->sourceCpt('post_type')`.
2. Chain field definitions, query parameters, write schemas, and policy.
3. Call `->register($router)` to wire it into a router.

**Example:**
```php
use BetterRoute\Resource\Resource;
use BetterRoute\Resource\ResourcePolicy;

$resource = Resource::make('books')
    ->restNamespace('myapp/v1')
    ->sourceCpt('book')
    ->fields(['id', 'title', 'status', 'content', 'meta'])
    ->allowedStatuses(['publish', 'draft'])
    ->deleteMode('trash') // 'force' (default) or 'trash'
    ->policy(ResourcePolicy::publicReadPrivateWrite('edit_posts'))
    ->register($router);
```

---

## Skill: Create a custom-table resource

**When:** The user wants CRUD endpoints over a custom database table.

**Critical rule (v0.3.0):** Custom table resources are **deny-by-default**. Reads and writes both fail until an explicit policy is configured.

**Steps:**
1. Use `Resource::make('name')->sourceTable($tableName)`.
2. Configure fields, filters, and a `policy()` (raw permissions array, or a `ResourcePolicy` preset).
3. Register against a router.

**Example:**
```php
use BetterRoute\Resource\Resource;
use BetterRoute\Resource\ResourcePolicy;

Resource::make('audit_events')
    ->restNamespace('myapp/v1')
    ->sourceTable('myapp_audit_events')
    ->fields(['id', 'event_type', 'user_id', 'created_at'])
    ->filters(['event_type', 'user_id'])
    ->sort(['created_at', 'id'])
    ->policy(ResourcePolicy::adminOnly('manage_options'))
    ->register($router);
```

---

## Skill: Validate write payloads with `writeSchema`

**When:** The user wants resource POST/PUT/PATCH bodies validated and coerced before reaching the handler.

**Steps:**
1. Call `->writeSchema([...])` (alias `->payloadSchema()`) on the resource.
2. Each entry maps a field name to a rule array.

**Supported rule keys:**
- `type`: `'int'|'integer'|'float'|'number'|'bool'|'boolean'|'string'|'date'|'email'|'url'|'enum'|'array'|'object'|'mixed'`
- `required`: `true` (enforced on `create`)
- `nullable`: `true`
- `min` / `max` (numeric)
- `minLength` / `maxLength` (string)
- `regex` (string)
- `enum`: `['values' => [...]]`
- `sanitize`: `'text'|'email'|'key'|'url'|callable`

**Example:**
```php
Resource::make('books')
    ->sourceCpt('book')
    ->writeSchema([
        'title'    => ['type' => 'string', 'required' => true, 'minLength' => 1, 'maxLength' => 200, 'sanitize' => 'text'],
        'isbn'     => ['type' => 'string', 'regex' => '/^[0-9]{10,13}$/'],
        'price'    => ['type' => 'float', 'min' => 0],
        'status'   => ['type' => 'enum', 'enum' => ['values' => ['draft', 'publish']], 'required' => true],
        'website'  => ['type' => 'url', 'nullable' => true],
    ])
    ->register($router);
```

**Errors:**
Validation failures return:
```json
{
  "error": {
    "code": "validation_failed",
    "message": "Invalid request.",
    "details": { "fieldErrors": { "title": ["..."], "price": ["..."] } }
  }
}
```

---

## Skill: Apply field-level write policies

**When:** The user wants per-field authorization on writes (e.g., only admins can change `featured`).

**Steps:**
1. Call `->fieldPolicy([...])` on the resource.
2. Map fields to predicates that decide whether the current request may write that field.

**Example:**
```php
Resource::make('books')
    ->sourceCpt('book')
    ->fieldPolicy([
        'featured' => static fn ($request, string $action): bool
            => current_user_can('manage_options'),
        'price'    => static fn ($request, string $action): bool
            => current_user_can('edit_posts'),
    ])
    ->register($router);
```

---

## Skill: Apply a `ResourcePolicy` preset

**When:** The user needs a quick, typed permission setup.

**Available presets:**
- `ResourcePolicy::adminOnly(string $cap = 'manage_options')` — every action denied unless the user has the capability.
- `ResourcePolicy::publicReadPrivateWrite(string|array $writeCap = 'manage_options')` — `list`/`get` open; `create`/`update`/`delete` require the capability.
- `ResourcePolicy::capabilities(array $permissions)` — per-action caps. Keys: `list`, `get`, `create`, `update`, `delete`, `*`. Values: `bool`, capability string, list of capabilities, or callable.
- `ResourcePolicy::callbacks(array $callbacks)` — per-action `callable($request, string $action, Resource $self): bool`.

**Example:**
```php
$resource->policy(ResourcePolicy::capabilities([
    '*'      => 'edit_posts',
    'delete' => 'manage_options',
]));
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
use BetterRoute\Middleware\Auth\WpClaimsUserMapper;

$verifier = new Hs256JwtVerifier(
    secret: 'your-secret-key',
    leewaySeconds: 30,
    expectedIssuer: 'https://issuer.example.com',
    expectedAudience: 'myapp',
    requireExpiration: true,        // v0.3.0 default
    maxLifetimeSeconds: 3600,
    maxTokenLength: 8192             // v0.3.0 default
);

$jwt = new JwtAuthMiddleware(
    verifier: $verifier,
    requiredScopes: ['api:read'],
    userMapper: new WpClaimsUserMapper() // default idClaims: ['user_id', 'uid', 'wp_user_id']
);

$router->group('/protected', function ($group) {
    $group->get('/me', fn($ctx) => Response::ok($ctx->user));
})->middleware($jwt);
```

**Rules (v0.3.0):**
- `exp` is required by default. Pass `requireExpiration: false` to disable.
- `expectedIssuer` and `expectedAudience` enable strict `iss`/`aud` validation when set.
- `maxLifetimeSeconds` rejects tokens whose `exp - iat` exceeds the cap.
- `maxTokenLength` rejects oversized tokens before parsing.
- `WpClaimsUserMapper` no longer maps `sub` by default — re-add it to `idClaims` if needed.

---

## Skill: Cache GET responses with ETag

**When:** The user wants HTTP-level cacheability with `If-None-Match` / `304 Not Modified`.

**Steps:**
1. Instantiate `ETagMiddleware`.
2. Add it to a route or group.

**Example:**
```php
use BetterRoute\Middleware\Cache\ETagMiddleware;

$etag = new ETagMiddleware(weak: false);

$router->get('/profile/{id}', $handler)
    ->middleware([$etag]);
```

**Rules:**
- Only applies to `GET` and `HEAD` requests.
- Hash is computed from the response body unless an `etagResolver` callable is provided.
- Returns `304` (no body) when `If-None-Match` matches the computed ETag (or `*`).

---

## Skill: Resolve the client IP behind proxies

**When:** The user is behind Cloudflare / a load balancer and needs the real client IP for rate limiting, logging, or audit.

**Example:**
```php
use BetterRoute\Http\ClientIpResolver;

$resolver = new ClientIpResolver(
    trustedProxies: ['127.0.0.1', '10.0.0.5'],
    trustedHeaders: ['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR']
);

$ip = $resolver->resolve(); // null if REMOTE_ADDR unavailable
```

**Rules:**
- If `REMOTE_ADDR` is not in `$trustedProxies`, it is returned as-is (the proxy chain is ignored — never trust unauthenticated header IPs).
- Default trusted headers: `HTTP_X_FORWARDED_FOR`, `HTTP_CF_CONNECTING_IP`, `HTTP_X_REAL_IP`.

---

## Skill: Use the WP object cache for rate limiting

**When:** The user wants in-memory rate limiting on a host with a persistent object cache.

**Example:**
```php
use BetterRoute\Middleware\RateLimit\RateLimitMiddleware;
use BetterRoute\Middleware\RateLimit\WpObjectCacheRateLimiter;

$middleware = new RateLimitMiddleware(
    new WpObjectCacheRateLimiter(group: 'myapp_rl'),
    limit: 60,
    windowSeconds: 60
);
```

**Rules:**
- Throws `RuntimeException` at construction if `wp_cache_*` functions are unavailable.
- Use `TransientRateLimiter` as a fallback when no object cache is configured.

---

## Skill: Persist idempotency state in `wpdb`

**When:** The user wants idempotency that survives object-cache flushes.

**Steps:**
1. Instantiate `WpdbIdempotencyStore` with a table name (default: `better_route_idempotency`).
2. Call `installSchema()` once (typically on plugin activation).
3. Inject into `IdempotencyMiddleware`.

**Example:**
```php
use BetterRoute\Middleware\Write\IdempotencyMiddleware;
use BetterRoute\Middleware\Write\WpdbIdempotencyStore;

register_activation_hook(__FILE__, function (): void {
    (new WpdbIdempotencyStore())->installSchema();
});

$store = new WpdbIdempotencyStore();
$middleware = new IdempotencyMiddleware($store, ttlSeconds: 600, requireKey: true);
```

**Rules:**
- Cross-database table names (containing `.`) are rejected.
- Schema includes a TTL index; expired rows are pruned on access.

---

## Skill: Configure idempotency on write endpoints

**When:** The user wants to prevent duplicate writes (double-submit protection).

**How it works:**
- Client sends `Idempotency-Key: <unique-key>` header with POST/PUT/PATCH requests.
- If the same key was seen within the TTL, the cached response is returned without re-executing the handler.

**Example:**
```php
\BetterRoute\BetterRoute::wooRouteRegistrar()
    ->register('myapp/v1', [
        'idempotency' => [
            'enabled'    => true,
            'requireKey' => true,
            'ttlSeconds' => 600,
        ],
    ]);
```

**Rules (v0.3.0):**
- The default key is identity-aware: `{provider}:user:{userId}` → `{provider}:sub:{subject}` → `'guest'`. Pass an explicit `keyResolver` to preserve pre-v0.3.0 keys.
- Use `WpdbIdempotencyStore` instead of the default array store for cross-request persistence.
- `requireKey: true` makes missing `Idempotency-Key` headers fail with `400 idempotency_key_required`.

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
    'title'         => 'My API',
    'version'       => 'v0.3.0',
    'strictSchemas' => true, // throws on missing component refs
    'components'    => \BetterRoute\BetterRoute::wooOpenApiComponents(),
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

header('Content-Type: application/json');
echo json_encode($document, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
```

**Rules:**
- `strictSchemas: true` throws `InvalidArgumentException` if a `$ref` points to an unknown component, instead of substituting `{ type: 'object', additionalProperties: true }`.
- `strictSchemas: false` (default) preserves the v0.2.0 forgiving behavior.

---

## Skill: Publish an `openapi.json` endpoint

**When:** The user wants the OpenAPI document served as a live REST endpoint.

**Example:**
```php
use BetterRoute\OpenApi\OpenApiRouteRegistrar;

OpenApiRouteRegistrar::register(
    restNamespace: 'myapp/v1',
    contractsProvider: static fn (): array => $router->contracts(openApiOnly: true),
    options: [
        'title'   => 'My API',
        'version' => 'v0.3.0',
        // To make the doc public, override the v0.3.0 admin-only default:
        'permissionCallback' => static fn (): bool => true,
    ]
);
```

**Rules (v0.3.0):**
- Default permission is `current_user_can('manage_options')`. Override with `permissionCallback` if you need a different policy.
- The endpoint path is `/openapi.json` under the namespace.

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
- Customer endpoints: only users with the `customer` role are returned.

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
- **v0.3.0:** keys starting with `_` (underscore) are not writable and not returned by default. Pass `$allowProtected = true` only when the caller has business reason to touch protected meta.

---

## Skill: Understand the error contract

**When:** The agent needs to interpret or handle API errors.

**Every error response follows this envelope:**
```json
{
  "error": {
    "code": "error_code",
    "message": "Human-readable message",
    "requestId": "unique-request-id",
    "details": {}
  }
}
```

**Common error codes:**
- `400` — validation error, unknown parameters, missing required fields, `validation_failed`, `idempotency_key_required`
- `401` — `invalid_token`, authentication required
- `403` — insufficient permissions
- `404` — resource not found
- `409` — `idempotency_conflict`, `hpos_required`, duplicate email
- `503` — `woo_unavailable`

**Rules (v0.3.0):**
- For `status >= 500` from non-`ApiException` failures, the message is normalized to `"Unexpected error."` and `details` is empty — internal exception class and message no longer leak.
- For `status === 400` from non-`ApiException` failures, `details.exception` still includes the class name (developer aid for misuse).
- Validation failures (`validation_failed`) include `details.fieldErrors` mapping each invalid field to its error messages.
