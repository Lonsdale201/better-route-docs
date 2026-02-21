---
title: Resource API Reference
---

## Constructor

- `Resource::make(string $name): Resource`

## Source selection

- `restNamespace(string $restNamespace)`
- `sourceCpt(string $postType)`
- `sourceTable(string $table, string $primaryKey = 'id')`

## Contract shape

- `allow(array $actions)`
- `fields(array $fields)`
- `filters(array $filters)`
- `filterSchema(array $schema)`
- `sort(array $sort)`
- `policy(array $policy)`

## Pagination and envelope

- `defaultPerPage(int $defaultPerPage)`
- `maxPerPage(int $maxPerPage)`
- `maxOffset(int $maxOffset)`
- `uniformEnvelope(bool $enabled = true)`

## CPT-specific controls

- `cptVisibleStatuses(array $statuses)`
- `cptVisibilityPolicy(callable $policy)`

## Repository injection

- `usingCptRepository(CptRepositoryInterface $repository)`
- `usingTableRepository(TableRepositoryInterface $repository)`

## Registration and contracts

- `register(?DispatcherInterface $dispatcher = null): void`
- `contracts(bool $openApiOnly = false): array`
- `descriptor(): array`
- `name(): string`

## Policy keys

Supported policy patterns:

- `public => true`
- `permissionCallback => callable`
- `permissions => ['list' => true|false|string|array|callable, '*' => ...]`
- `scopes => ['content:read', ...]`

## Common example

```php
Resource::make('raw-articles')
    ->restNamespace('better-route/v1')
    ->sourceTable('ai_raw_articles', 'id')
    ->allow(['list', 'get'])
    ->fields(['id', 'title', 'source'])
    ->filters(['source'])
    ->sort(['id'])
    ->policy(['permissions' => ['list' => true, 'get' => true]])
    ->register();
```
