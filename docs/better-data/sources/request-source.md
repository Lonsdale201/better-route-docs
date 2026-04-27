---
title: RequestSource
---

`BetterData\Source\RequestSource` is a fluent builder that hydrates a DataObject from a `WP_REST_Request` after enforcing a configurable set of guards.

```php
$dto = RequestSource::from($request)
    ->requireNonce('save_settings')
    ->requireCapability('manage_options')
    ->bodyOnly()
    ->noCollision(['id'])
    ->into(SettingsDto::class);
```

The builder is single-shot — `into()` consumes the configured guards, fetches the right input bucket, and constructs the DTO.

## Entry point

```php
RequestSource::from(\WP_REST_Request $request): self
```

## Guards

All guards return `self` for chaining. They run in registration order at `into()` time, before the DTO is constructed.

### `requireNonce(string $action, string $paramName = '_wpnonce'): self`

Verifies a WordPress nonce.

- Reads `$request->get_param($paramName)` first; falls back to the `X-WP-Nonce` header
- Calls `wp_verify_nonce()`
- Throws `NonceVerificationFailedException` on failure

### `requireCapability(string $capability, mixed ...$args): self`

Verifies the current user can perform the action.

- Calls `current_user_can($capability, ...$args)`
- `$args` forwarded to WP's capability check (e.g., post ID for `edit_post`)
- Throws `CapabilityCheckFailedException` on failure

### `noCollision(array $routeOwnedFields): self`

Asserts the listed field names do **not** appear in client-controlled buckets (body, JSON body, query string).

```php
->noCollision(['id'])
```

Used to prevent a malicious body from overriding URL-owned identifiers (`PUT /widgets/{id}` with `{id: 999}` in the body).

Throws `RequestParamCollisionException` if any field is found outside URL parameters.

## Source bucket selection

By default `RequestSource` reads from `$request->get_params()`, which merges all input buckets. To restrict the source:

- `bodyOnly()` — `get_body_params()` only (form-encoded body)
- `jsonOnly()` — `get_json_params()` only (parsed JSON body)
- `queryOnly()` — query string only
- `urlOnly()` — URL/route params only (path segments)

These are mutually exclusive — the last call wins.

## Terminal: `into(string $dtoClass): DataObject`

1. Runs guards in registration order
2. Resolves the input bucket per the source restriction
3. If `noCollision` was set, merges URL params as authoritative overlay
4. Calls `$dtoClass::fromArray($params)`

`into()` does **not** run validation. To validate, use `fromArrayValidated()` semantics by chaining:

```php
$dto = RequestSource::from($request)->bodyOnly()->into(SettingsDto::class);
$dto->validate()->throwIfInvalid();
```

Or use the `BetterRouteBridge`, which runs validation automatically. See [Composition → BetterRouteBridge](../../composition/better-route-bridge).

## Full example

```php
register_rest_route('myapp/v1', '/settings', [
    'methods' => 'POST',
    'callback' => function (\WP_REST_Request $request) {
        try {
            $dto = RequestSource::from($request)
                ->requireNonce('save_settings')
                ->requireCapability('manage_options')
                ->bodyOnly()
                ->into(SettingsDto::class);

            $dto->validate()->throwIfInvalid();

            return $dto->saveAsOption('myplugin_settings');
        } catch (NonceVerificationFailedException) {
            return new \WP_Error('nonce_invalid', 'Invalid nonce.', ['status' => 403]);
        } catch (CapabilityCheckFailedException) {
            return new \WP_Error('forbidden', 'Insufficient privileges.', ['status' => 403]);
        } catch (ValidationException $e) {
            return new \WP_Error('validation_failed', 'Invalid input.', [
                'status' => 400,
                'errors' => $e->errors(),
            ]);
        }
    },
]);
```

## Common mistakes

- Forgetting to call `into()` — the builder doesn't auto-run; nothing happens until `into()` consumes the chain
- Adding guards after a source restriction expecting them to also affect later calls — guards always run before bucket resolution; `bodyOnly()` after `requireNonce()` reads nonce as usual (from any bucket / header)
- Expecting `noCollision` to *also* require the URL field to be present — it only blocks collisions; it doesn't enforce presence. Validate the URL params explicitly via `Required` if your DTO needs them
