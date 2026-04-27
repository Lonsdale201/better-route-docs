---
title: "#[Sensitive]"
---

`BetterData\Attribute\Sensitive` is a presentation-layer marker for fields that should be excluded from output by default. Used for PII (social security number, internal note, IP address) where the field is plain text in storage and memory but should not flow into REST responses or other output surfaces unless the call site explicitly opts in.

## Declaration

```php
use BetterData\Attribute\Sensitive;

final readonly class CustomerDto extends DataObject {
    public function __construct(
        public int $id = 0,
        public string $email = '',

        #[Sensitive]
        public ?string $socialSecurityNumber = null,

        #[Sensitive]
        public ?string $internalNote = null,
    ) {}
}
```

## What `#[Sensitive]` does

| Layer | Behavior |
|---|---|
| Hydration (`fromArray`, sources) | No effect — the field hydrates normally |
| `DataObject::toArray()` | No effect — the field appears in output |
| Sinks (`PostSink`, etc.) | No effect — the field writes to storage |
| `Presenter::toArray()` / `toJson()` | **Excluded by default** — opt-in via `includeSensitive([...])` |

The attribute only affects the Presenter. The field is plain text everywhere else.

## Opt-in inclusion

```php
$json = Presenter::for($customer)
    ->context(PresentationContext::admin())
    ->includeSensitive(['internalNote'])  // explicit whitelist
    ->toJson();
```

The whitelist is per-render. Each presentation pipeline declares which sensitive fields it intends to expose; everything else stays redacted.

## Combining with capability checks

`includeSensitive` doesn't apply capability checks itself. Combine with `hideUnlessCan` for role-gated PII:

```php
Presenter::for($customer)
    ->context(PresentationContext::admin())
    ->includeSensitive(['internalNote', 'socialSecurityNumber'])
    ->hideUnlessCan('socialSecurityNumber', 'manage_options')
    ->toArray();
```

This includes both fields in the candidate set, then hides `socialSecurityNumber` for non-admins.

## `#[Sensitive]` vs `Secret`

They're orthogonal — different problems, different layers.

| | `#[Sensitive]` | `Secret` |
|---|---|---|
| **Layer** | Presentation only | Type system; affects every serialization |
| **Storage** | Plain text | Plain text (or encrypted with `#[Encrypted]`) |
| **In-memory** | Plain string | Wrapped, leak-proof |
| **`toArray()`** | Included as plain text | Always `'***'` |
| **Presenter default** | Excluded | Excluded **and** redacted |
| **Reveal mechanism** | `includeSensitive(['field'])` | `Secret::reveal()` |

You can combine them:

```php
#[Sensitive]
public ?string $publicEmail = null;

#[Encrypted]
public ?Secret $apiKey = null;

#[Sensitive]
#[Encrypted]
public ?Secret $bankAccountToken = null;  // double protection
```

For the third case:
- `#[Encrypted]` keeps the value encrypted at rest
- `Secret` keeps it leak-proof in memory
- `#[Sensitive]` ensures Presenter excludes it by default
- To expose: `includeSensitive(['bankAccountToken'])` AND `compute('bankAccountToken', fn ($d) => $d->bankAccountToken?->reveal())` inside a strictly-audited code path (e.g., admin re-key flow)

## Common mistakes

- Treating `#[Sensitive]` as encryption — it's a presentation gate only. The plaintext is in storage and memory. For at-rest protection, add `#[Encrypted]`. For in-memory protection, type the property as `Secret`.
- Forgetting to add the field to `includeSensitive` — the field stays redacted; output is missing the value. Make the whitelist explicit per render.
- Putting `#[Sensitive]` on a `Secret` field expecting `includeSensitive` to reveal it — `Secret` redacts even when the Presenter would include it. Use a `compute` closure with `reveal()` for explicit exposure.
