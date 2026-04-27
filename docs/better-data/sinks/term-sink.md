---
title: TermSink
---

`BetterData\Sink\TermSink` writes a DataObject to `wp_terms` + `wp_termmeta`.

## Methods

```php
TermSink::toArgs(DataObject $dto, ?array $only = null): array
TermSink::insert(...): int
TermSink::update(...): int
TermSink::save(...): int
```

## Special projection shape

Term writes go through `wp_insert_term($name, $taxonomy, $args)` and `wp_update_term($termId, $taxonomy, $args)`, which have different signatures from the post/user equivalents. `toArgs()` returns a structured payload to match:

```php
TermSink::toArgs($dto);
/*
[
    'term_id'  => 12,
    'name'     => 'Books',
    'taxonomy' => 'product_category',
    'args'     => [                         // remaining wp_update_term args
        'slug'        => 'books',
        'description' => 'Book products',
        'parent'      => 0,
    ],
    'meta'     => [
        'write'  => ['display_color' => '#000000'],
        'delete' => [],
    ],
]
*/
```

`insert()` and `update()` extract `name` and `taxonomy` from the projection and call the right `wp_*_term()` function with the rest.

## Excluded fields

`term_taxonomy_id` and `count` are computed by WordPress (the latter changes whenever a term-relationship changes). `TermSink` silently drops them on write even if the DTO declares them.

## Required fields

`wp_insert_term` requires `name` and `taxonomy`. If either is missing or empty in the DTO, `TermSink::insert()` throws `RuntimeException` before calling WP.

## Example

```php
final readonly class CategoryDto extends DataObject {
    use HasWpSources, HasWpSinks;

    public function __construct(
        public int $id = 0,
        public string $name = '',
        public string $slug = '',
        public string $taxonomy = 'category',
        public string $description = '',
        public int $parent = 0,

        #[MetaKey('display_color')]
        public string $color = '#000000',
    ) {}
}

$category = CategoryDto::fromArray($input);
$category->saveAsTerm();

// Update meta only
$existing = CategoryDto::fromTerm($id);
$existing->with(['color' => '#ff0000'])->saveAsTerm(only: ['color']);
```

## Common mistakes

- Setting `count` on the DTO and expecting it to write — WP recomputes it; the sink drops it
- Forgetting `taxonomy` is required — `wp_insert_term` will fail; set a sensible default in the constructor
- Trying to change `taxonomy` via update — taxonomies are immutable for an existing term; create a new term instead
