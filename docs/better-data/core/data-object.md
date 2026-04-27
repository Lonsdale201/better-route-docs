---
title: DataObject
---

`BetterData\DataObject` is the abstract base class for every typed DTO in the library. Subclasses are `final readonly class` and declare their shape through constructor-promoted properties.

## Contract

```php
use BetterData\DataObject;

final readonly class WidgetDto extends DataObject
{
    public function __construct(
        public int $id = 0,
        public string $title = '',
        public ?\DateTimeImmutable $publishedAt = null,
    ) {}
}
```

Three invariants:

1. `final readonly class`. Immutability is load-bearing for `Secret`, `with()`, and the projection-first sink API.
2. Constructor promotion for properties.
3. **Every trailing parameter has a default.** PHP silently demotes earlier defaults to "required" when a later parameter has no default — `MissingRequiredFieldException` would fire at hydration. Use `int $id = 0`, `string $foo = ''`, `?T $bar = null`.

## Public methods

### `static fromArray(array $data): static`

Hydrates from a string-keyed array. Matches keys to constructor parameter names.

- Missing required parameters → `MissingRequiredFieldException`
- Missing optional/nullable parameters → uses default or `null`
- Values are coerced through `TypeCoercer` ([Type coercion](type-coercion))
- `#[Encrypted]` fields are decrypted if their value carries the `bd:v1:` envelope
- `#[ListOf(InnerDto::class)]` arrays recurse element-by-element

```php
$dto = WidgetDto::fromArray(['id' => '42', 'title' => 'Hello']);
//                                  ^ string -> int via coercion
```

### `static fromArrayValidated(array $data, ?ValidationEngineInterface $engine = null): static`

Hydrates and validates in one shot.

- Hydration phase: throws `TypeCoercionException` or `MissingRequiredFieldException`
- Validation phase: throws `ValidationException` if any rule fails
- Default engine: `BuiltInValidator`. Pass a custom `ValidationEngineInterface` to swap in Symfony Validator, Respect, etc.

### `toArray(): array`

Serializes public properties to a plain array.

| Type | Output |
|---|---|
| `BackedEnum` | `.value` |
| `DateTimeInterface` | ATOM ISO-8601 string |
| `Secret` | `'***'` (redacted) |
| Nested `DataObject` | recursive `toArray()` |
| `JsonSerializable` | `jsonSerialize()` result |
| Arrays | recursively serialized |
| `#[Sensitive]` plain string | included as-is (only Presenter redacts these) |

`toArray()` does **not** decrypt `#[Encrypted]` fields — they only decrypt during hydration. If the DTO carries plaintext at runtime (the normal case), `toArray()` includes the plaintext (or `'***'` for `Secret` types).

### `with(array $changes): static`

Returns a new instance with selected fields replaced.

```php
$updated = $dto->with(['price' => 24.99, 'stock' => 100]);
```

- Snapshots current property values, merges in `$changes`, re-runs constructor through `fromArray()`
- **Preserves rich types** through the merge — `Secret` stays a `Secret`, `DateTimeImmutable` stays a `DateTimeImmutable`, `BackedEnum` stays an enum case (the snapshot bypasses `toArray()`)
- Re-runs type coercion on the merged set, so passing strings for typed fields still coerces correctly
- Throws the same exceptions as `fromArray()` if the merged shape fails coercion

### `validate(?ValidationEngineInterface $engine = null): ValidationResult`

Returns a [`ValidationResult`](validation) without throwing.

```php
$result = $dto->validate();
if (!$result->isValid()) {
    foreach ($result->flatten() as $error) {
        error_log($error);
    }
}
```

## Hydration vs validation

Hydration enforces shape (types, required fields). Validation enforces business rules (`Required`, `Email`, `MinLength`, etc.). They're explicit, separate steps:

```php
// Shape only — throws on type errors and missing required params
$dto = WidgetDto::fromArray($data);

// Shape + rules — throws on validation failures too
$dto = WidgetDto::fromArrayValidated($data);

// Shape now, defer validation
$dto = WidgetDto::fromArray($data);
$dto->validate()->throwIfInvalid();
```

## Common mistakes

- Skipping `final readonly` — mutable DTOs break `with()` semantics and `Secret` redaction guarantees
- Required parameter (no default) followed by optional ones — PHP demotes the optional ones to required, `MissingRequiredFieldException` fires
- Expecting `toArray()` to reveal `Secret` — call `Secret::reveal()` explicitly when you need the plaintext
- Mutating an array property after `with()` — properties are arrays, but the DataObject instance itself is immutable; treat returned arrays as snapshots

## Validation checklist

- `final readonly class` declaration
- Every constructor parameter has a default
- `fromArray` round-trips: `fromArray($dto->toArray())` produces an equivalent DTO (modulo redacted `Secret` values)
- `with()` returns a new instance with the requested changes and unchanged remainder
