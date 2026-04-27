---
title: Presenter Overview
---

`BetterData\Presenter\Presenter` projects a DataObject into a context-specific output shape — REST JSON, admin list rows, email bodies, CSV lines.

```php
use BetterData\Presenter\PresentationContext;
use BetterData\Presenter\Presenter;

$json = Presenter::for($product)
    ->context(PresentationContext::rest())
    ->only(['id', 'title', 'price', 'priceFormatted'])
    ->compute('priceFormatted', fn ($p) => wc_price($p->price))
    ->rename('post_title', 'title')
    ->toJson();
```

## Entry points

```php
Presenter::for(DataObject $dto): Presenter
Presenter::forCollection(iterable $dtos): CollectionPresenter
```

`forCollection` replays the configuration over every DTO in the iterable. Same fluent methods, same terminal `toArray()` / `toJson()`.

## Fluent methods

All return `self` for chaining.

### Context

- `.context(PresentationContext $context)` — sets the active context (REST / admin / email / custom). See [PresentationContext](presentation-context).

### Field selection

- `.only(array $fields, bool $strict = false)` — whitelist. `strict: true` throws `UnknownFieldException` on typos (must be a property name or computed field name).
- `.hide(string|array $field, ?callable $when = null)` — hide field(s); optional predicate `fn(PresentationContext) => bool`.
- `.hideUnlessCan(string $field, string $capability, ...$args)` — shorthand for `hide($field, fn($ctx) => !$ctx->userCan($cap, ...$args))`.
- `.showOnlyFor(string $field, array $roles)` — shorthand: hide unless current user has one of the listed roles.

### Field shaping

- `.rename(string|array $from, ?string $to = null)` — rename output keys. Single: `rename('post_title', 'title')`. Bulk: `rename(['post_title' => 'title', 'post_name' => 'slug'])`.
- `.compute(string $name, Closure $factory)` — add or override a field with a computed value. Closure: `fn(DataObject $dto, PresentationContext $ctx): mixed`. Lazy — only invoked if the field survives `only()` / `hide()` filters.
- `.preset(string $field, Closure $renderer)` — override the rendering of a nested field. Closure: `fn(mixed $value, PresentationContext $ctx): mixed`.

### Sensitive / Secret

- `.includeSensitive(array $fields)` — opt-in whitelist of `#[Sensitive]`-marked fields to include in output. Even when included, `Secret`-typed values still redact to `'***'`. To reveal a `Secret`, do it inside a `compute` closure.

### Formatting

- `.formatDate(string $field, string $format, ?string $as = null)` — format `DateTimeInterface` via `DateTimeFormatter` (locale + timezone aware). If `$as` is null, replaces the field; otherwise creates a new field under `$as`.
- `.formatCurrency(string $field, ?string $as = null, ?string $currency = null, bool $html = false)` — format numeric via `CurrencyFormatter` (WooCommerce-aware when available, plain fallback otherwise). `$html: true` wraps in WC HTML markup.

## Terminal methods

- `.toArray(): array` — serialize to plain associative array
- `.toJson(?int $flags = null): string` — JSON-encode the array. Always forces `JSON_THROW_ON_ERROR`. Default flags: `JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES`.

`CollectionPresenter` exposes the same terminals, returning `list<array>` and a JSON-encoded list respectively.

## Operation order in `toArray()`

```
1. Collect DTO public properties
2. Apply per-field `preset` renderers (if registered)
3. Recurse on nested DataObject / arrays of DataObject
4. Merge `compute` closures (computed fields can override properties)
5. Redact #[Sensitive] fields (unless in includeSensitive whitelist)
6. Redact Secret-typed fields (always — only `Secret::reveal()` in compute escapes)
7. Apply `only` whitelist
8. Apply `hide` predicates
9. Apply `rename` map
   ↓
10. Result: array
```

`toJson()` adds the encode step on top.

## Subclassing

For reusable configurations, subclass and override `configure()`:

```php
final class ProductPresenter extends Presenter
{
    protected function configure(): void
    {
        $this
            ->rename('post_title', 'title')
            ->compute('formattedPrice', fn ($p) => wc_price($p->price))
            ->hideUnlessCan('cost', 'manage_woocommerce');
    }
}

ProductPresenter::for($product)
    ->context(PresentationContext::rest())
    ->toArray();
```

`configure()` runs during construction. Fluent calls after construction can still override or add to the configuration.

## Common mistakes

- Calling `Secret::reveal()` outside a `compute` closure expecting the rendered output — `toArray()` always redacts `Secret` to `'***'`. Reveal only inside a closure where the call site is auditable.
- Using `only()` and forgetting to include a computed field name — computed fields count as fields; `only(['id', 'title'])` excludes a `compute('formattedPrice', ...)` field.
- Setting `rename('a', 'x')` and `rename('b', 'x')` — collision throws `LogicException`.
- Expecting `formatDate` to mutate the original field — by default it does (replaces); pass `as: 'displayDate'` to keep the original and add a new field.
