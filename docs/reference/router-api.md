---
title: Router API Reference
---

## `Router::make($vendor, $version)`

Creates router instance with namespace `<vendor>/<version>`.

## `middleware(array $middlewares)`

Adds middleware globally, or to current group scope when called inside `group()`.

## `middlewareFactory(callable $factory)`

Resolves class-string middleware with dependencies.

Factory signature:

```php
callable(string $class): mixed
```

## `group(string $prefix, callable $callback)`

Nests routes and middlewares under prefix.

## HTTP method mapping

- `get($uri, $handler)`
- `post($uri, $handler)`
- `put($uri, $handler)`
- `patch($uri, $handler)`
- `delete($uri, $handler)`

Returns `RouteBuilder` for chain methods.

## `routes()`

Returns internal `RouteDefinition` list.

## `baseNamespace()`

Returns final namespace string.

## `contracts(bool $openApiOnly = false)`

Returns contract list for OpenAPI/export.

## `register(?DispatcherInterface $dispatcher = null)`

Registers all routes through dispatcher (`WordPressRestDispatcher` by default).

## `RouteBuilder` methods

- `middleware(array $middlewares)`
- `meta(array $meta)`
- `args(array $args)`
- `permission(callable $permissionCallback)`

Example:

```php
$router->get('/items/(?P<id>\d+)', $handler)
    ->args(['id' => ['required' => true, 'type' => 'integer']])
    ->meta(['operationId' => 'itemsGet'])
    ->permission(static fn (): bool => current_user_can('read'));
```
