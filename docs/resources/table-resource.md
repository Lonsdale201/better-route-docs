---
title: Table Resource
---

Table resources map custom DB tables through `WordPressTableRepository`/`WpdbAdapter`.

## Minimal example

```php
use BetterRoute\Resource\Resource;

Resource::make('raw-articles')
    ->restNamespace('better-route/v1')
    ->sourceTable('ai_raw_articles', 'id')
    ->allow(['list', 'get', 'create', 'update', 'delete'])
    ->fields(['id', 'source', 'title', 'lang', 'published', 'created_at', 'updated_at'])
    ->filters(['source', 'lang', 'published'])
    ->filterSchema([
        'source' => 'string',
        'lang' => 'string',
        'published' => 'bool',
    ])
    ->sort(['created_at', 'id'])
    ->maxPerPage(100)
    ->maxOffset(5000)
    ->register();
```

## SQL safety model

`WpdbAdapter` enforces:

- identifier validation for table/field/sort names
- prepared statements for values
- prefixed table resolution via `$wpdb->prefix`

## Scenario: ingestion rows with typed filters

- Declare `source_id` as `int`, `published` as `bool`
- Requests like `?source_id=12&published=true` are type-coerced before repository call

## Common mistakes

- Missing `fields()` (required for table resources)
- Using invalid SQL identifiers in field names
- Assuming unknown query params are ignored

## Validation checklist

- list queries use LIMIT/OFFSET with prepared args
- invalid identifiers fail early
- create/update payload keys outside allowlist return `400 validation_failed`
