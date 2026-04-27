---
title: MetaKeyRegistry
---

`BetterData\Registration\MetaKeyRegistry` walks a DataObject's constructor parameters, finds every `#[MetaKey]` attribute, and registers each one with WordPress via `register_meta()`. It also produces JSON Schema and REST args projections from the same DTO declaration.

The registry handles **data shape** registration only. It does **not** register post types, taxonomies, or REST routes — those are app-level decisions.

## `register()`

```php
MetaKeyRegistry::register(
    string $dtoClass,
    string $objectType = 'post',  // 'post' | 'user' | 'term' | 'comment'
    string $subtype = '',          // post type / taxonomy slug for object_subtype
): list<string>
```

Returns the list of meta keys that were actually registered.

```php
add_action('init', function (): void {
    register_post_type('product', [...]);

    MetaKeyRegistry::register(
        ProductDto::class,
        objectType: 'post',
        subtype: 'product',
    );
});
```

## What gets passed to `register_meta()`

For each `#[MetaKey]` parameter, the registry calls `register_meta($objectType, $meta->key, $args)` with:

| `$args` key | Source |
|---|---|
| `single` | `$meta->single` (default `true`) |
| `type` | `$meta->type` if set; otherwise inferred from PHP type |
| `description` | `$meta->description` if set |
| `default` | `$meta->default` if set |
| `show_in_rest` | If `$meta->showInRest`, set to `['schema' => RestSchemaBuilder::buildMetaSchema(...)]` |
| `sanitize_callback` | `$meta->sanitize` if set (a callable name string) |
| `auth_callback` | If `$meta->authCapability` is set, a closure wrapping `user_can($userId, $cap, $objectId)` |
| `object_subtype` | `$subtype` argument (post types, taxonomies) |

## Guards (`_doing_it_wrong`)

The registry emits two `_doing_it_wrong` warnings during registration. Both fire on the `init` hook, so they're visible in development logs without breaking production.

### Encrypted + `showInRest`

```php
#[MetaKey('_api_key', encrypt: true, showInRest: true)]
```

Reason: WordPress core's REST read path calls `get_post_meta()` directly. The decryption logic in `AttributeDrivenHydrator` is bypassed. Without the warning, REST consumers would receive the raw `bd:v1:...` ciphertext.

Solutions:

- Remove `showInRest: true` and expose the field through a custom REST endpoint that uses `better-data` hydration
- Or remove `_` from the key and treat the field as non-secret

### Protected meta without `authCapability`

```php
#[MetaKey('_internal_field', showInRest: true)]
```

Reason: WordPress defaults the `auth_callback` for `_`-prefixed meta keys to `__return_false`. REST writes silently fail with 403.

Solutions:

- Set `authCapability: 'edit_posts'` (or another capability the writer should have)
- Or drop the `_` prefix

## `toJsonSchema()`

```php
MetaKeyRegistry::toJsonSchema(string $dtoClass): array
```

Returns a root-object JSON Schema, ready to drop into OpenAPI `components/schemas/<Name>`:

```php
$schema = MetaKeyRegistry::toJsonSchema(ProductDto::class);

/*
[
    'type' => 'object',
    'required' => ['post_title', 'sku'],
    'properties' => [
        'id' => ['type' => 'integer'],
        'post_title' => ['type' => 'string', 'minLength' => 2, 'maxLength' => 200],
        'price' => ['type' => 'number', 'minimum' => 0],
        'sku' => ['type' => 'string', 'pattern' => '^[A-Z]{2,4}-\\d+$'],
        ...
    ],
]
*/
```

The schema combines:

- PHP types → JSON Schema types (`int` → `integer`, `?string` → `['string', 'null']`, etc.)
- Validation rule attributes → schema constraints (`Email` → `format: email`, `MinLength` → `minLength`, etc.)
- `BackedEnum` → `enum: [...]`
- `Secret`-typed fields → `format: password` (Swagger UI redacts these inputs)
- Nested DataObjects → recursive schemas

## `toRestArgs()`

```php
MetaKeyRegistry::toRestArgs(string $dtoClass): array
```

Returns a flat per-field map for `register_rest_route(['args' => ...])`:

```php
$args = MetaKeyRegistry::toRestArgs(CreateProductDto::class);

register_rest_route('shop/v1', '/products', [
    'methods' => 'POST',
    'args' => $args,
    'callback' => function ($req) {
        $dto = CreateProductDto::fromArrayValidated($req->get_params());
        return $dto->saveAsPost();
    },
]);
```

Each entry includes `type`, `required`, `description`, and any constraints derived from rule attributes (`format: email`, `enum`, `pattern`, etc.).

`toRestArgs` is the convention `better-route`'s `BetterRouteBridge` uses internally — see [Composition → BetterRouteBridge](../../composition/better-route-bridge).

## Type inference

When `MetaKey($type)` is null, the registry infers the type from the PHP type:

| PHP type | JSON Schema type |
|---|---|
| `int` | `'integer'` |
| `float` | `'number'` |
| `bool` | `'boolean'` |
| `string` | `'string'` |
| `array` | `'array'` (with conservative `items: {type: 'string'}` if no `#[ListOf]`) |
| `BackedEnum` | type of the first case's value, plus `enum: [...]` |
| `DateTimeImmutable` | `'string'` with `format: 'date-time'` |
| `Secret` | `'string'` with `format: 'password'` |
| Nested `DataObject` | `'object'` with recursive schema |
| Nullable variant | type becomes `[type, 'null']` |

For arrays with `#[ListOf(InnerDto::class)]`, the schema becomes `array` with `items` referring to the inner schema.

## Required field rules

A field is `required` in the JSON Schema when:

- It has `#[Required]` rule attribute, OR
- It has no default value AND its type is non-nullable

A field is **not** required when:

- It has a default value (any default counts, including `null`)
- Its type is nullable (`?T`)

## What it does NOT register

- Post types, taxonomies — call `register_post_type()` / `register_taxonomy()` yourself
- REST routes — use `register_rest_route()` directly with `toRestArgs()`, or use `BetterRouteBridge` for full handler wiring
- WP options — options are a separate sink with no registration step

This intentional limit keeps the library data-shape-only and lets the consumer keep their existing CPT / taxonomy / route structure.

## Common mistakes

- Calling `register()` outside `init` — `_doing_it_wrong` checks may run before WP is ready; register from the `init` hook
- Forgetting `objectType` — the default is `'post'`; for users / terms / comments, pass it explicitly
- Setting `subtype` to a post type slug for which `register_post_type` hasn't run yet — order your `init` hook calls so the CPT registers before `MetaKeyRegistry::register()`
- Putting business validation in the JSON Schema and expecting WP to enforce it — `register_meta`'s schema validates *write* shape via REST; values can still be set programmatically without going through it. Use `validate()` on the DTO for runtime validation.
