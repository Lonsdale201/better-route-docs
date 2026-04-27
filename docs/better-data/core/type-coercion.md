---
title: Type Coercion
---

`BetterData\Internal\TypeCoercer` is the engine behind `DataObject::fromArray()`. It converts raw input values (strings from `$_POST`, numerics from `$wpdb`, ISO datetimes from REST) into the PHP types declared on your DTO.

## Precedence rules

1. **Null handling.** `null` passes through if the parameter type is nullable; otherwise `TypeCoercionException`.
2. **Named types only.** Union and intersection types throw `TypeCoercionException` — declare a single type per parameter.
3. **Built-in scalars.** `'string'`, `'int'`, `'float'`, `'bool'`, `'array'`, `'mixed'` pass through their respective coercion paths.
4. **Class types.** `Secret`, `DateTimeImmutable`, `BackedEnum`, nested `DataObject` are recognized by FQN.

## Scalar coercion

| Source | Target | Result |
|---|---|---|
| `string` | `string` | passed as-is |
| numeric `string` (`'42'`, `'3.14'`) | `int` | `(int) $value` |
| numeric `string` | `float` | `(float) $value` |
| `'0'`, `'1'`, `'true'`, `'false'`, `'yes'`, `'no'`, `'on'`, `'off'` | `bool` | parsed intelligently |
| numeric `string` | `bool` | `!= '0'` → true |
| `array` | `array` | passed as-is |
| anything else for `array` | `array` | `TypeCoercionException` |
| any value | `mixed` | passed as-is |

## DateTimeImmutable

`DateTimeImmutable` is the supported datetime type. `DateTime` is also accepted at hydration but converted to immutable.

| Source | Behavior |
|---|---|
| Already a `DateTimeInterface` | Converted via `DateTimeImmutable::createFromInterface()` |
| Non-empty string | Constructed with optional timezone hint (see below) |
| Integer | Interpreted as Unix timestamp (UTC) |
| `null` (nullable param) | Pass-through |
| Anything else | `TypeCoercionException` |

### Timezone hints

`PostSource` and `UserSource` pre-tag known datetime fields:

- `post_date`, `post_modified` → site timezone
- `post_date_gmt`, `post_modified_gmt` → UTC
- `user_registered` → UTC

`AttributeDrivenHydrator` constructs `DateTimeImmutable($value, new DateTimeZone($tz))` so the resulting instance carries the correct zone. If timezone construction fails, the raw string passes through and `TypeCoercer` raises a meaningful error downstream.

For custom datetime sources (options, rows), pass strings in any format `DateTimeImmutable::__construct()` accepts.

## BackedEnum

```php
enum Status: string {
    case Draft = 'draft';
    case Published = 'publish';
}

final readonly class PostDto extends DataObject {
    public function __construct(
        public Status $status = Status::Draft,
    ) {}
}

PostDto::fromArray(['status' => 'publish']); // → Status::Published
PostDto::fromArray(['status' => 'invalid']); // throws TypeCoercionException
```

The coercer calls `Status::from($value)`, translating `ValueError` into `TypeCoercionException` with field context.

## Secret

```php
#[MetaKey('_api_key')]
public ?Secret $apiKey = null;

WidgetDto::fromArray(['apiKey' => 'sk_live_abc']);
// $apiKey is Secret::class, not a string
```

Strings (and `Stringable` objects) coerce to `new Secret($value)`. Already-`Secret` values pass through.

`#[Encrypted]` fields decrypt **before** type coercion, so the `Secret` wraps the plaintext, not the ciphertext.

## Nested DataObject

```php
final readonly class AddressDto extends DataObject {
    public function __construct(
        public string $city = '',
        public string $zip = '',
    ) {}
}

final readonly class UserDto extends DataObject {
    public function __construct(
        public AddressDto $address = new AddressDto(),
    ) {}
}

UserDto::fromArray(['address' => ['city' => 'Budapest', 'zip' => '1011']]);
```

The coercer recognizes the parameter type as a `DataObject` subclass and delegates to `AddressDto::fromArray()`.

If the input value is already an `AddressDto` instance (e.g., from a `with()` merge), it passes through.

## #[ListOf]: arrays of DataObject

```php
#[ListOf(LineItemDto::class)]
public array $items = [];
```

The coercer iterates the array. For each element:

- Already an instance of the declared class → passes through
- Array → coerced via `$class::fromArray()`
- Anything else → `TypeCoercionException`

The element class doesn't need to extend `DataObject` — anything with a static `fromArray(array): self` works.

## Errors

`TypeCoercionException` carries the DTO class, field name, target type, and the problematic value:

```
"Cannot coerce 'foo' (string) to int for field WidgetDto::price"
```

Trap it in REST handlers and surface a 400 with the field context. The `BetterRouteBridge` does this automatically.

## What is NOT coerced

- WP storage formats (e.g., MySQL `'Y-m-d H:i:s'`) — `DateTimeImmutable::__construct()` parses these natively, no special path needed
- Unsupported PHP types (resources, closures, `Generator`) — pass through `'mixed'` only
- Union/intersection types — explicitly rejected to keep coercion deterministic
- Stringly-typed numerics that don't actually look numeric (`'three'` → int) — fails with `TypeCoercionException`

## Common mistakes

- Declaring `int|null` instead of `?int` — works the same, but the coercer treats only single named types as canonical
- Expecting `'2024-01-15'` to become a `DateTimeImmutable` at midnight UTC when no timezone hint is set — falls back to PHP's default timezone (`date_default_timezone_get()`)
- Passing JSON-encoded strings expecting them to be decoded — coercion does not call `json_decode`; decode at the source
