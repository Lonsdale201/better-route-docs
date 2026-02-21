---
title: CPT Resource
---

CPT resources map a post type to REST endpoints with policy and visibility controls.

## Minimal example

```php
use BetterRoute\Resource\Resource;

Resource::make('articles')
    ->restNamespace('better-route/v1')
    ->sourceCpt('post')
    ->allow(['list', 'get', 'create', 'update', 'delete'])
    ->fields(['id', 'title', 'slug', 'excerpt', 'content', 'date', 'status', 'author'])
    ->filters(['status', 'author', 'after', 'before'])
    ->filterSchema([
        'status' => ['type' => 'enum', 'values' => ['publish', 'draft', 'private']],
        'author' => 'int',
        'after' => 'date',
        'before' => 'date',
    ])
    ->cptVisibleStatuses(['publish'])
    ->policy([
        'permissions' => [
            'list' => true,
            'get' => true,
            'create' => 'edit_posts',
            'update' => 'edit_posts',
            'delete' => 'delete_posts',
        ],
        'scopes' => ['content:*'],
    ])
    ->register();
```

## Visibility model

- Default visible statuses: `['publish']`
- If `status` filter is omitted, default status filter is applied
- `cptVisibilityPolicy(callable)` can further restrict row-level visibility

## Scenario: keep drafts hidden from public API

- Set `cptVisibleStatuses(['publish'])`
- Keep `permissions.get/list = true`
- Draft rows return `404 not_found` even when ID exists

## Common mistakes

- Allowing `status` filter but forgetting to declare schema enum
- Exposing draft/private without explicit decision
- Expecting `delete` to soft-delete (current implementation uses force delete)

## Validation checklist

- list route returns only visible statuses
- get route returns `404` for hidden statuses
- policy permission callbacks execute per action
