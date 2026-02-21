---
title: Resources Overview
---

`BetterRoute\Resource\Resource` provides a DSL to register CRUD-style endpoints for CPTs or custom tables.

## When to use

- You want list/get/create/update/delete with strict contract controls
- You need predictable fields/filters/sort behavior
- You want OpenAPI-ready metadata from the same declaration

## Minimal example

```php
use BetterRoute\Resource\Resource;

Resource::make('articles')
    ->restNamespace('better-route/v1')
    ->sourceCpt('post')
    ->allow(['list', 'get', 'create', 'update', 'delete'])
    ->fields(['id', 'title', 'slug', 'status'])
    ->filters(['status'])
    ->filterSchema(['status' => ['type' => 'enum', 'values' => ['publish', 'draft']]])
    ->sort(['date', 'id'])
    ->register();
```

## Supported actions

- `list`
- `get`
- `create`
- `update` (both `PUT` and `PATCH`)
- `delete`

## Core guardrails

- unknown query params return `400 validation_failed`
- field allowlist enforced for projections and writes
- pagination limits enforced (`defaultPerPage`, `maxPerPage`, `maxOffset`)

## Common mistakes

- Missing `fields()` on table resources
- Invalid `restNamespace` format
- Assuming hidden CPT statuses are still retrievable via `get`

## Validation checklist

- routes registered for all requested actions
- contracts available via `contracts()`
- list responses include `meta.page`, `meta.perPage`, `meta.total`
