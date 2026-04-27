---
title: PresentationContext
---

`BetterData\Presenter\PresentationContext` is an immutable value object that carries the rendering context: which surface is consuming the output (REST, admin, email), which user is making the request, and the locale/timezone for date and currency formatting.

## Construction

```php
new PresentationContext(
    string $name,                   // 'rest', 'admin', 'email', or any custom label
    ?int $userId = null,             // null = no user context
    ?string $locale = null,          // null = WP's current locale
    ?string $timezone = null,        // null = WP's current timezone
    array $meta = [],                // free-form bag for custom predicates
);
```

## Factory shortcuts

```php
PresentationContext::rest(?int $userId = null);
PresentationContext::admin(?int $userId = null);
PresentationContext::email(?int $userId = null, ?string $locale = null);
PresentationContext::none();  // guest, no user, no locale
```

`rest()` and `admin()` infer the current user from WordPress when `$userId` is not provided. `email()` accepts an explicit locale (useful when sending an email to a user whose preferred language differs from the active site locale).

## Fluent builders (return new instances)

```php
$ctx = PresentationContext::rest()
    ->withUserId(42)
    ->withLocale('hu_HU')
    ->withTimezone('Europe/Budapest')
    ->withMeta(['cohort' => 'wholesale'])
    ->withName('checkout-confirmation-email');
```

Each `with*` call returns a new `PresentationContext` — the original is unchanged.

## Query methods

- `.userCan(string $capability, ...$args): bool` — `user_can($userId, $cap, ...$args)`. Returns `false` when no user context is set.
- `.userRoles(): list<string>` — current user's roles. Empty list when no user context.

## Locale-aware formatting

`formatDate` and `formatCurrency` honor the context's locale and timezone:

```php
$dto = ProductDto::fromPost(42);

Presenter::for($dto)
    ->context(PresentationContext::email(userId: 42, locale: 'hu_HU'))
    ->formatDate('publishedAt', 'F j, Y', as: 'publishedReadable')
    ->formatCurrency('price', as: 'priceDisplay', currency: 'HUF')
    ->toArray();
// publishedReadable: '2024 március 15' (Hungarian month)
// priceDisplay: '5 990 Ft' (Hungarian currency)
```

The locale flows through `switch_to_locale()` for the duration of the formatter call, then reverts.

## Custom contexts

The `name` field is free-form. Use it to drive predicates that depend on consumer-specific behavior:

```php
$presenter
    ->hide('debugInfo', fn ($ctx) => $ctx->name !== 'debug-dump')
    ->hide('costBreakdown', fn ($ctx) => !in_array($ctx->name, ['admin', 'email']));
```

## Common patterns

### Capability-based hiding

```php
->hideUnlessCan('cost', 'manage_woocommerce')
->hideUnlessCan('internalNote', 'edit_others_posts')
```

### Role-based access

```php
->showOnlyFor('wholesalePrice', roles: ['wholesale', 'administrator'])
```

### Free-form metadata

```php
$ctx = PresentationContext::rest()->withMeta(['tier' => 'pro']);

$presenter->hide('basicOnlyField', fn ($c) => ($c->meta['tier'] ?? null) === 'pro');
```

## Common mistakes

- Building a context inside the closure on every render — construct once, pass to `Presenter::context()`
- Expecting `userCan` to return `true` when no user context is set — without `$userId`, capability checks always return `false`. Use `PresentationContext::admin()` (which infers the current user) for admin-side rendering
- Setting `withTimezone('UTC')` and expecting `formatDate` to display UTC — `formatDate` honors the context timezone for display, but the underlying `DateTimeImmutable` retains its own timezone. The formatter converts before formatting
