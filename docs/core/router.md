---
title: Router
---

`BetterRoute\Router\Router` is the contract-first route builder.

## When to use

- You need fully custom handlers (not CRUD resource presets)
- You want per-route meta for OpenAPI
- You need middleware at global/group/route scope

## Minimal example

```php
use BetterRoute\Router\Router;

add_action('rest_api_init', function (): void {
    $router = Router::make('better-route', 'v1')
        ->middleware([
            static function ($ctx, callable $next): mixed {
                return $next($ctx);
            },
        ]);

    $router->group('/admin', function (Router $r): void {
        $r->get('/health', fn (): array => ['ok' => true])
            ->meta(['operationId' => 'adminHealth', 'tags' => ['Admin']])
            ->permission(static fn (): bool => current_user_can('manage_options'));
    });

    $router->register();
});
```

## Public API

- `Router::make(string $vendor, string $version): Router`
- `middleware(array $middlewares): self`
- `middlewareFactory(callable $factory): self`
- `group(string $prefix, callable $callback): self`
- `get/post/put/patch/delete(string $uri, mixed $handler): RouteBuilder`
- `routes(): array`
- `baseNamespace(): string`
- `contracts(bool $openApiOnly = false): array`
- `register(?DispatcherInterface $dispatcher = null): void`

## Handler signatures

`ArgumentResolver` supports:

- `fn (): mixed`
- `fn (RequestContext $ctx): mixed`
- `fn ($request): mixed`
- `fn (RequestContext $ctx, $request): mixed`
- `[ControllerClass::class, 'method']` (instantiated internally)

## Common mistakes

- Class-string middleware requiring constructor args without `middlewareFactory`
- Missing explicit `permission()` where auth policy is needed
- Registering outside `rest_api_init` without custom dispatcher

## Validation checklist

- middleware order is `global -> group -> route`
- generated route URIs are normalized (`/x` not `//x/`)
- `contracts(true)` excludes `openapi.include=false`
