---
title: Sinks Overview
---

Sinks are the write path. Each one moves data from a typed DataObject back into a WordPress shape (post, user, term, option, custom row).

## Available sinks

| Sink | Writes to | Backed by |
|---|---|---|
| `PostSink` | posts + post_meta | `wp_insert_post` / `wp_update_post`, `update_post_meta`, `delete_post_meta` |
| `UserSink` | users + user_meta | `wp_insert_user` / `wp_update_user`, `update_user_meta`, `delete_user_meta` |
| `TermSink` | terms + term_meta | `wp_insert_term` / `wp_update_term`, `update_term_meta`, `delete_term_meta` |
| `OptionSink` | options | `update_option` |
| `RowSink` | custom DB tables | `$wpdb->insert` / `$wpdb->update` |

## Two API styles

Every sink offers both **projection** and **convenience** methods:

### Projection — returns the payload, doesn't touch storage

```php
PostSink::toArgs($dto, $only = null);    // → wp_insert_post args
PostSink::toMeta($dto, $only = null);    // → ['write' => [...], 'delete' => [...]]
OptionSink::toArray($dto, $only = null); // → option payload
RowSink::toArray($dto, $only = null);    // → row payload
```

These return raw values. They do **not** call WordPress and do **not** apply `wp_slash()`. They're unit-testable without a live WP environment.

### Convenience — performs the WP calls, with `wp_slash()` baked in

```php
PostSink::save($dto);
PostSink::insert($dto);
PostSink::update($dto, $postId);
OptionSink::save($dto, 'option_name');
RowSink::insert($wpdb, $table, $dto);
RowSink::update($wpdb, $table, $dto, $where);
```

Convenience methods pass values through `wp_slash()` before calling WP functions (because WP internally calls `wp_unslash()`). This means a payload with backslashes round-trips correctly:

```php
$dto = WidgetDto::fromArray(['note' => 'C:\\path\\to\\file']);
$dto->saveAsPost();
// On re-read: 'C:\path\to\file' (unchanged)
```

If you call `update_post_meta()` directly with the raw projection output, you must apply `wp_slash()` yourself.

## Common options

All sinks accept these options on convenience methods:

### `?array $only = null`

Whitelist specific properties to write. Other properties are ignored.

```php
$dto->saveAsPost(only: ['price', 'stock']);
// Only the _price and _stock meta keys are touched. Everything else stays as-is.
```

### `bool $strict = false`

When `true`, `$only` entries that don't exist on the constructor throw `UnknownFieldException`. Catches typos.

```php
$dto->saveAsPost(only: ['pirce'], strict: true); // typo → throws
```

### `bool $skipNullDeletes = false`

Controls how `null` values are written for meta-backed fields.

| Mode | Default — `false` | PATCH — `true` |
|---|---|---|
| Field is `null` | `delete_post_meta()` is called for the key | The key is left untouched |
| Field has a value | `update_post_meta()` is called | `update_post_meta()` is called |

PATCH mode is what you want when the consumer sent only the fields they wanted to change — fields they didn't send are `null` in the DTO but should not be deleted from storage.

```php
// Full update — null values remove existing meta
$dto->saveAsPost();

// Partial update — only update what's set; preserve everything else
$dto->saveAsPost(skipNullDeletes: true);
```

Equivalent: combine `only:` with `skipNullDeletes: true` for stricter PATCH semantics.

## Write flow

```
DataObject
    ↓
SinkProjection::project (walk constructor in reverse)
   ├── #[MetaKey] field
   │       ↓
   │   value === null?
   │       ├── default mode → schedule for delete
   │       └── skipNullDeletes mode → omit
   │       ↓
   │   prepareValue (Secret reveal, BackedEnum unwrap, DateTime format, recursive arrays)
   │       ↓
   │   #[Encrypted] or MetaKey(encrypt: true)? → EncryptionEngine::encrypt
   ├── system field (#[PostField] / #[UserField] / #[TermField] / #[Column])
   │       ↓
   │   prepareValue (force UTC for *_gmt fields, DateFormat overrides)
   └── output: {system: [...], meta: [...], metaToDelete: [...]}
        ↓
PostSink::save / update / insert
    ↓
wp_slash($args) → wp_insert_post / wp_update_post
update_post_meta($id, $key, wp_slash($value)) for each meta entry
delete_post_meta($id, $key) for each metaToDelete
```

## What gets excluded automatically

| Sink | Always excluded |
|---|---|
| `UserSink` | `user_pass`, `user_activation_key` (use `wp_set_password()` for passwords) |
| `TermSink` | `term_taxonomy_id`, `count` (computed by WP) |

These fields can appear on the DTO (e.g., for hydration from a source) — the sink silently drops them on write.

## HasWpSinks trait

Add to a DTO for instance method shortcuts:

```php
use BetterData\Sink\HasWpSinks;

final readonly class ProductDto extends DataObject
{
    use HasWpSinks;
}

$dto->saveAsPost(only: ['price']);
$dto->toPostArgs(only: ['price']);

$dto->saveAsUser();
$dto->toUserArgs();

$dto->saveAsTerm();

$dto->saveAsOption('myplugin_settings');
$dto->toOptionArray();

$dto->saveAsRow($wpdb, 'wp_orders', where: ['id' => 42]);
$dto->toRowArray();
```

## Common mistakes

- Calling a projection method then `update_post_meta()` directly without `wp_slash()` — backslashes get stripped on re-read
- Expecting `null` to silently skip — by default, `null` triggers a meta delete; pass `skipNullDeletes: true` for PATCH semantics
- Using `strict: true` with a `$only` list pulled from `$_POST` — typos in user input become `UnknownFieldException`. Strict mode is for developer-supplied lists, not user input
- Using `update()` without `id` set on the DTO and without `$postId` — `MissingIdentifierException`
