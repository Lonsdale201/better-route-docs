---
title: Ownership Guards
---

`OwnershipGuardMiddleware` and `OwnedResourcePolicy` *(v0.5.0)* are reusable helpers for the "user can only see their own row" pattern. They sit between an authenticated route and the data layer and reject requests where the requester is not the resource owner.

Use them when capability checks (`current_user_can('edit_posts')`) are too coarse — public-client APIs typically authenticate with `customer`-tier accounts that share the same capability but must not see each other's data.

## When to use which

- `OwnershipGuardMiddleware` — for **raw `Router` routes**. You write the resolver that turns a request into an owner ID; the middleware compares it to the auth context.
- `OwnedResourcePolicy::currentUserOwns()` — for **Resource DSL** endpoints (`Resource::make()->policy(...)`). Generates per-action permissions that read the URL `id` and call your resolver.

Both can be combined with a `bypassCapability` so admins keep working.

## `OwnershipGuardMiddleware`

```php
use BetterRoute\Middleware\Auth\OwnershipGuardMiddleware;

$router->get('/account/orders/(?P<id>\d+)', $handler)
    ->middleware([
        new OwnershipGuardMiddleware(
            ownerResolver: static fn ($context): ?int => resolve_order_owner_id($context->request),
            bypassCapability: 'manage_woocommerce',
            deniedStatus: 404
        ),
    ])
    ->protectedByMiddleware('bearerAuth');
```

### Constructor

```php
new OwnershipGuardMiddleware(
    callable $ownerResolver,
    ?string $bypassCapability = null,
    int $deniedStatus = 404
);
```

- `ownerResolver(RequestContext $ctx): int|string|null` — return the owner ID for the resource the request is targeting. Returning `null` is treated as "denied" (the resource may not exist or the resolver could not determine an owner).
- `bypassCapability` — when provided, users with this capability bypass the check entirely. The request gets `ownership.bypassed = true` in attributes for downstream visibility.
- `deniedStatus` — `404` (default, recommended) returns `not_found` and does not leak existence; `403` returns `forbidden` and does.

### Identity comparison

The middleware reads identity from `RequestContext::$attributes['auth']`:

1. `auth.userId` (positive int) — wins.
2. `auth.subject` (non-empty string) — used when no integer userId.
3. `get_current_user_id()` fallback — for cookie/nonce flows.

Both sides are compared as strings, so a numeric `userId` from JWT and an integer ID from the data layer compare cleanly.

### Handler-side context

On success, the middleware adds an `ownership` attribute to the context:

```php
[
    'owner'    => 42,
    'identity' => 42,
    'bypassed' => false,
]
```

When `bypassCapability` matches, only `['bypassed' => true]` is set — the resolver is not called. Handlers can read this to log bypasses.

## `OwnedResourcePolicy::currentUserOwns()`

```php
use BetterRoute\Resource\OwnedResourcePolicy;

Resource::make('records')
    ->restNamespace('better-route/v1')
    ->sourceTable('app_records', 'id')
    ->policy(OwnedResourcePolicy::currentUserOwns(
        ownerResolver: static fn (int $id): ?int => resolve_record_owner_id($id),
        ownedActions: ['get', 'update', 'delete'],
        bypassCapability: 'manage_options',
        allowListForAuthenticatedUsers: true
    ))
    ->register();
```

### Signature

```php
OwnedResourcePolicy::currentUserOwns(
    callable $ownerResolver,
    array $ownedActions = ['get', 'update', 'delete'],
    ?string $bypassCapability = 'manage_options',
    bool $allowListForAuthenticatedUsers = true
): array
```

Returns a permissions array compatible with `Resource::policy()`. Internally:

- `list` is gated on `get_current_user_id() > 0` when `allowListForAuthenticatedUsers` is `true`. (You still need a filter to scope `list` results to the current user — the policy decides authorization, not the SQL.)
- Each action in `ownedActions` becomes a callback that:
  1. returns `true` if the user has `bypassCapability`;
  2. otherwise resolves the URL `id`, calls `ownerResolver($id, $request, $action)`, and returns `(string)$ownerId === (string)$currentUserId`.

`ownerResolver` receives the resolved integer `id` from the URL — different from the middleware version, which receives the full `RequestContext`.

### Listing only the user's own rows

The policy authorizes the action; it does not narrow the result set. Add a filter that injects `user_id = current_user_id()` into the query — for table resources you can do this through `Resource::filterSchema()` and a default param, or by filtering in your data adapter.

## Differences from 0.4.0 `ResourcePolicy`

`ResourcePolicy` (0.3.0) ships generic presets: `adminOnly`, `publicReadPrivateWrite`, `capabilities`, `callbacks`. They authorize by capability or by per-action callable, but they do not have a built-in concept of "this row belongs to this user."

`OwnedResourcePolicy::currentUserOwns()` is a named pattern for that exact case — it wires the URL `id`, the auth identity, and the bypass capability together so callers do not have to repeat the boilerplate per resource.

## Common mistakes

- Returning `0` from the resolver instead of `null` when the resource does not exist — `0` compares equal to `(int) get_current_user_id()` for unauthenticated users, accidentally allowing access. Always return `null` for missing rows.
- Using `deniedStatus: 403` on routes that probe existence — clients can enumerate IDs by watching for `404` vs `403`.
- Forgetting to scope `list` results — the policy lets authenticated users call `list`; without a filter they see everyone's rows.
- Combining ownership with `manage_options` only — for WC customer-owned data, prefer `manage_woocommerce` so shop managers keep working.

## Validation checklist

- request from the owner returns `200`;
- request from a different authenticated user returns `404` (or `403` if configured);
- bypass capability holders receive `ownership.bypassed = true` in context;
- `list` results are scoped to the current user (verify in handler/data layer, not just policy).
