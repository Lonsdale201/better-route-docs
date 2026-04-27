---
title: PostSource
---

`BetterData\Source\PostSource` hydrates a DataObject from a `WP_Post` plus its `post_meta`.

## Methods

```php
PostSource::hydrate(int|\WP_Post $post, string $dtoClass): DataObject
PostSource::hydrateMany(array $postIds, string $dtoClass): array
```

`hydrate()` throws `PostNotFoundException` when the post doesn't exist. `hydrateMany()` silently skips missing IDs and returns only successfully hydrated DTOs.

## What gets resolved

| Source | Reads from |
|---|---|
| Property with `#[MetaKey('_x')]` | `get_post_meta($id, '_x', true)` (`null` if missing) |
| Property with `#[PostField('post_title')]` | `$post->post_title` |
| Property name matches known WP_Post field | auto-resolved (no attribute needed) |
| Property `id` | auto-aliased to `ID` |

Known auto-detected fields: `ID`, `post_author`, `post_date`, `post_date_gmt`, `post_content`, `post_title`, `post_excerpt`, `post_status`, `comment_status`, `ping_status`, `post_password`, `post_name`, `to_ping`, `pinged`, `post_modified`, `post_modified_gmt`, `post_content_filtered`, `post_parent`, `guid`, `menu_order`, `post_type`, `post_mime_type`, `comment_count`.

## Timezone handling

Datetime fields get a timezone hint before coercion:

- `post_date`, `post_modified` → site timezone (`wp_timezone()`)
- `post_date_gmt`, `post_modified_gmt` → UTC

The result is a `DateTimeImmutable` with a non-default timezone reflecting the original semantic.

```php
final readonly class PostDto extends DataObject {
    public function __construct(
        public int $id = 0,
        public ?\DateTimeImmutable $post_date = null,         // site timezone
        #[PostField('post_date_gmt')]
        public ?\DateTimeImmutable $publishedAt = null,        // UTC
    ) {}
}
```

## Encrypted meta

`#[MetaKey] #[Encrypted]` (or `MetaKey(encrypt: true)`) decrypts the stored `bd:v1:...` envelope before type coercion:

```php
#[MetaKey('_api_key')]
#[Encrypted]
public ?Secret $apiKey = null;
```

The `Secret` instance wraps the plaintext, not the ciphertext.

## Bulk hydration

```php
$products = PostSource::hydrateMany([1, 2, 3, 4, 5], ProductDto::class);
```

Internally:

1. `_prime_post_caches([1, 2, 3, 4, 5], true, true)` — one query for all posts plus their term and meta caches
2. `update_meta_cache('post', $ids)` — one query for all post meta
3. Hydrate each post via `AttributeDrivenHydrator::hydrate()`

Two SQL queries for any number of posts.

## Distinguishing missing from empty

`metadata_exists('post', $id, $key)` is checked before fetch. The hydrator distinguishes:

- Key absent → `null` → field uses default (or stays `null` if nullable)
- Key present with empty string → coerced to whatever target type (e.g., `''` → `0` for int)

This matters when a meta key was once written and then deleted vs. never written at all.

## Example

```php
final readonly class ProductDto extends DataObject {
    use HasWpSources;

    public function __construct(
        public int $id = 0,
        public string $post_title = '',
        public string $post_status = 'publish',
        #[PostField('post_date_gmt')]
        public ?\DateTimeImmutable $publishedAt = null,

        #[MetaKey('_price', type: 'number')]
        public float $price = 0.0,

        #[MetaKey('_sku')]
        public string $sku = '',
    ) {}
}

$product = ProductDto::fromPost(42);
$products = ProductDto::fromPosts([1, 2, 3]);
```

## Common mistakes

- Calling before `_prime_post_caches` is available (very early hooks like `plugins_loaded` before WP loads core)
- Expecting `hydrateMany()` to throw on missing IDs — it silently skips them
- Forgetting that `id` (lowercase) auto-aliases to `ID` — declaring both `id` and `ID` is redundant
