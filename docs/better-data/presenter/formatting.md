---
title: Formatting and Computed Fields
---

The Presenter has three primary mechanisms for shaping output values: `compute`, `formatDate`, and `formatCurrency`.

## Computed fields

```php
->compute(string $name, Closure $factory): self
```

Closure signature: `fn(DataObject $dto, PresentationContext $ctx): mixed`.

```php
Presenter::for($product)
    ->compute('priceFormatted', fn ($p, $ctx) => wc_price($p->price))
    ->compute('isOnSale', fn ($p) => $p->salePrice > 0 && $p->salePrice < $p->price);
```

- The DTO type can be narrowed in the closure: `fn (ProductDto $p) => ...`
- The closure runs lazily — only invoked if the field name survives `only()` and `hide()` filters
- Computed fields can override DTO properties; if you `compute('price', ...)`, the original `price` property value is replaced
- Use `compute` to call `Secret::reveal()` when you actually need the plaintext in output (auditable at the call site)

```php
->compute('rawApiKey', fn ($p) => $p->apiKey?->reveal())
```

## Date formatting

```php
->formatDate(string $field, string $format, ?string $as = null): self
```

- Reads the named field, expects a `DateTimeInterface`
- Formats via `DateTimeFormatter` honoring the context's locale and timezone
- If `$as` is `null`, replaces the original field. Otherwise creates a new field under `$as` and leaves the original alone.

```php
->formatDate('publishedAt', 'F j, Y')                      // replace
->formatDate('publishedAt', 'F j, Y', as: 'publishedDate') // add new field
```

PHP's `DateTime::format()` syntax applies. The locale affects month and day names (`F`, `l`, `M`, `D`).

## Currency formatting

```php
->formatCurrency(string $field, ?string $as = null, ?string $currency = null, bool $html = false): self
```

- Reads the named field, expects a numeric value (`int` or `float`)
- Formats via `CurrencyFormatter` — uses WooCommerce's `wc_price()` when WC is active and the `$html` flag is true; falls back to a plain locale-aware number-format otherwise
- `$currency` is a 3-letter ISO code (`'USD'`, `'HUF'`, `'EUR'`); when null, uses WooCommerce's default or the context locale's currency
- `$html: true` returns a string with WC's HTML wrapping (`<span class="woocommerce-Price-amount">...</span>`); `false` returns plain text

```php
->formatCurrency('price')                                              // replace, plain
->formatCurrency('price', as: 'priceDisplay', currency: 'HUF')         // add new field
->formatCurrency('price', as: 'priceHtml', html: true)                 // WC HTML
```

## Combining date and currency with computed fields

```php
Presenter::for($order)
    ->context(PresentationContext::email(userId: $order->customerId))
    ->formatDate('createdAt', 'F j, Y', as: 'orderDate')
    ->formatCurrency('total', as: 'totalDisplay')
    ->compute('lineCount', fn ($o) => count($o->items))
    ->compute('subtotalDisplay', fn ($o) => wc_price($o->subtotal))
    ->only(['orderNumber', 'orderDate', 'totalDisplay', 'subtotalDisplay', 'lineCount'])
    ->toJson();
```

## Presets for nested fields

```php
->preset(string $field, Closure $renderer): self
```

Closure signature: `fn(mixed $value, PresentationContext $ctx): mixed`.

`preset` runs **before** the recursive render of nested values. Useful when you want to override how a nested DTO appears without subclassing its presenter.

```php
->preset('billingAddress', fn ($address, $ctx) => [
    'line' => "{$address->city}, {$address->country}",
])
```

## Working with collections

`CollectionPresenter` exposes the same fluent methods. Computed fields are evaluated per-DTO:

```php
$rows = Presenter::forCollection($products)
    ->context(PresentationContext::admin())
    ->compute('priceFormatted', fn ($p) => wc_price($p->price))
    ->only(['id', 'title', 'priceFormatted'])
    ->toArray();
```

## Common mistakes

- Expecting `compute('foo', ...)` to run when `foo` was hidden by `hide('foo', ...)` or excluded by `only([...])` — closures are lazy; they don't fire when the output won't include the field
- Forgetting to add the computed name to `only()` — `only(['id', 'price'])` excludes a `compute('priceFormatted', ...)` because `priceFormatted` isn't in the whitelist
- Using `formatCurrency` on a non-numeric field — fails with type error in `CurrencyFormatter`. Use `compute` for non-trivial cases
- Locale not changing the output — make sure the `PresentationContext` carries the locale (`PresentationContext::email(locale: 'hu_HU')`)
