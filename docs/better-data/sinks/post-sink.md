---
title: PostSink
---

`BetterData\Sink\PostSink` writes a DataObject back to `wp_posts` + `wp_postmeta`.

## Methods

```php
// Projection — return the payload, no WP calls, no slashing
PostSink::toArgs(DataObject $dto, ?array $only = null): array
PostSink::toMeta(DataObject $dto, ?array $only = null): array

// Convenience — perform the WP calls, with wp_slash()
PostSink::insert(DataObject $dto, ?array $only = null, bool $strict = false, bool $skipNullDeletes = false): int
PostSink::update(DataObject $dto, ?int $postId = null, ?array $only = null, bool $strict = false, bool $skipNullDeletes = false): int
PostSink::save(DataObject $dto, ?array $only = null, bool $strict = false, bool $skipNullDeletes = false): int
```

`save()` routes to `update()` if the DTO carries a positive `id`/`ID`, otherwise to `insert()`.

`update()` reads the post ID from the `$postId` parameter or from the DTO's `id`/`ID` field. If neither is provided, it throws `MissingIdentifierException`.

## Projection shape

```php
PostSink::toArgs($dto);
/*
[
    'ID' => 42,
    'post_title' => 'Hello',
    'post_status' => 'publish',
    'post_date_gmt' => '2024-03-15 09:30:00',
    'meta_input' => [
        '_price' => 199.95,
        '_sku' => 'X-1',
    ],
]
*/

PostSink::toMeta($dto);
/*
[
    'write' => [
        '_price' => 199.95,
        '_sku' => 'X-1',
    ],
    'delete' => [
        '_internal_note',  // null in DTO → marked for delete
    ],
]
*/
```

`toArgs()` includes a `meta_input` key when the DTO has any non-null `#[MetaKey]` fields. `wp_insert_post`/`wp_update_post` apply this meta on save (no need to call `update_post_meta()` separately when using `meta_input`).

`toMeta()` returns the meta separately — use this when you want to apply meta changes outside the post insert/update flow.

## Slashing policy

- `insert()`, `update()`, `save()` — apply `wp_slash()` to args and to each meta value before calling WP functions
- `toArgs()`, `toMeta()` — return raw values; caller is responsible for slashing if they issue WP calls themselves

## Encrypted meta on write

`#[MetaKey] #[Encrypted]` (or `MetaKey(encrypt: true)`) encrypts the value via `EncryptionEngine` before writing. The `bd:v1:...` envelope ends up in `wp_postmeta`.

## Examples

### Insert + update via `save()`

```php
$dto = ProductDto::fromArray($input);
$id = $dto->saveAsPost();   // inserts (id was 0); returns the new post ID

$updated = $dto->with(['id' => $id, 'price' => 24.99]);
$updated->saveAsPost();      // updates
```

### Partial update with `only`

```php
$existing = ProductDto::fromPost($id);
$existing->with(['price' => 99.99])->saveAsPost(only: ['price']);
// Only _price meta touched; post fields and other meta unchanged
```

### PATCH semantics with `skipNullDeletes`

```php
// User submitted partial JSON; missing fields are null in the DTO
$dto = ProductDto::fromArray($jsonBody);
$dto->saveAsPost(skipNullDeletes: true);
// Existing meta keys for null fields are NOT deleted
```

### Projection-first — apply your own logic

```php
$args = PostSink::toArgs($dto);
$meta = PostSink::toMeta($dto);

// Inspect / mutate / log before persisting
do_action('myplugin/before_save', $args);

$id = wp_insert_post(wp_slash($args), true);
foreach ($meta['write'] as $key => $value) {
    update_post_meta($id, $key, wp_slash($value));
}
foreach ($meta['delete'] as $key) {
    delete_post_meta($id, $key);
}
```

## Common mistakes

- Calling `update()` without an ID source — set `id`/`ID` on the DTO or pass `$postId` explicitly
- Mixing `meta_input` (from `toArgs`) and individual `update_post_meta()` calls — pick one path; `meta_input` runs the full meta replace inside `wp_insert_post`
- Forgetting that `null` in a meta-backed field triggers a delete by default — use `skipNullDeletes: true` for partial updates from JSON bodies
