---
title: TermSource
---

`BetterData\Source\TermSource` hydrates a DataObject from a `WP_Term` plus its `term_meta`.

## Methods

```php
TermSource::hydrate(int|\WP_Term $term, string $dtoClass): DataObject
TermSource::hydrateMany(array $termIds, string $dtoClass): array
```

`hydrate()` throws `TermNotFoundException` for missing IDs.

## Auto-detected fields

`term_id`, `name`, `slug`, `term_group`, `term_taxonomy_id`, `taxonomy`, `description`, `parent`, `count`.

The `id` property auto-aliases to `term_id` (the WP_Term primary key, unlike posts/users where it's `ID`).

## Bulk hydration

`update_meta_cache('term', $ids)` once, then hydrate each term.

## Example

```php
final readonly class CategoryDto extends DataObject {
    use HasWpSources;

    public function __construct(
        public int $id = 0,
        public string $name = '',
        public string $slug = '',
        public string $taxonomy = 'category',
        public string $description = '',

        #[MetaKey('display_color')]
        public string $color = '#000000',

        #[MetaKey('feature_image_id')]
        public int $featureImageId = 0,
    ) {}
}

$category = CategoryDto::fromTerm($termId);
```

## Read-only fields

`term_taxonomy_id` and `count` are computed by WordPress and effectively read-only. Including them in the DTO is fine for reads; the [TermSink](../sinks/term-sink) silently drops them on write.

## Common mistakes

- Declaring `id` and `term_id` both — `id` auto-aliases to `term_id`
- Expecting `count` to round-trip — write side will drop it (it's computed by WP at term-relationship change)
