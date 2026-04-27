---
title: Validation
---

Validation is an explicit step separate from hydration. Hydration enforces shape (types, required fields). Validation enforces business rules.

```php
$result = $dto->validate();
$dto = WidgetDto::fromArrayValidated($data); // hydrate + validate, throws on failure
```

## Built-in rules

All rules live in `BetterData\Validation\Rule\` and target `Attribute::TARGET_PARAMETER | Attribute::TARGET_PROPERTY`.

| Attribute | Constructor | Pass condition |
|---|---|---|
| `#[Required]` | `()` | not `null`, not empty string, not empty array |
| `#[Email]` | `()` | `filter_var(..., FILTER_VALIDATE_EMAIL)` (skips null) |
| `#[Url]` | `()` | `filter_var(..., FILTER_VALIDATE_URL)` (skips null) |
| `#[Uuid]` | `()` | RFC 4122 v1–8 format (skips null) |
| `#[Regex(string $pattern, ?string $message = null)]` | PCRE pattern | `preg_match` matches (skips null) |
| `#[Min(int\|float $min)]` | numeric | `>= $min` (skips null; non-numeric fails with `'must be numeric'`) |
| `#[Max(int\|float $max)]` | numeric | `<= $max` (skips null; non-numeric fails with `'must be numeric'`) |
| `#[MinLength(int $min)]` | int | strings `mb_strlen >= $min`, arrays `count >= $min` (skips null) |
| `#[MaxLength(int $max)]` | int | strings/arrays `<= $max` (skips null) |
| `#[OneOf(array $allowed)]` | scalar list | strict `in_array($value, $allowed, true)` (skips null) |

`Callback` is also available, but constructed programmatically (closures aren't valid attribute arguments):

```php
use BetterData\Validation\Rule\Callback;

new Callback(fn ($value, $field, $subject): ?string =>
    $value > 100 ? null : 'must be greater than 100'
);
```

Used inside a custom rule provider or a validation engine override.

## Short-circuit behavior

`BuiltInValidator` runs rules in declaration order. **The first failing rule on a field stops further rules on that field** — you don't get cascades like `Required → Email → MinLength` for a single empty input.

```php
#[Rule\Required, Rule\Email, Rule\MaxLength(100)]
public string $email = '';

// On empty input: only "is required" reported. Email and MaxLength skipped.
```

## ValidationResult

`validate()` returns a `ValidationResult`:

```php
final readonly class ValidationResult
{
    public array $errors = [];  // 'fieldPath' => list<string>

    public function isValid(): bool;
    public function hasErrors(): bool;
    public function errorsFor(string $fieldPath): array;
    public function firstError(string $fieldPath): ?string;
    public function flatten(): array;          // ['fieldPath: message', ...]
    public function throwIfInvalid(): void;    // throws ValidationException
}
```

Field paths use dot notation for nested DTOs:

```php
$result->errors;
// [
//   'title' => ['must not be blank'],
//   'address.zip' => ['does not match the expected format'],
//   'items.0.quantity' => ['must be at least 1'],
// ]
```

`flatten()` returns a flat list of `"path: message"` strings, useful for logging or simple error displays.

## Throwing wrappers

`fromArrayValidated()` runs hydration + validation and throws on either failure:

```php
$dto = WidgetDto::fromArrayValidated($data);
// TypeCoercionException or MissingRequiredFieldException — hydration phase
// ValidationException — validation phase
```

`ValidationException::errors()` returns the same dict as `ValidationResult::errors`.

## Custom validation engines

Implement `ValidationEngineInterface` to swap in Symfony Validator, Respect/Validation, Laravel Validator, or in-house logic:

```php
interface ValidationEngineInterface
{
    public function validate(DataObject $subject): ValidationResult;
}
```

Pass the engine to `validate()` or `fromArrayValidated()`:

```php
$dto->validate(new SymfonyValidatorBridge($validator));
WidgetDto::fromArrayValidated($data, new SymfonyValidatorBridge($validator));
```

The default `BuiltInValidator` reads `Rule\*` attributes; a custom engine can ignore those entirely and use whatever metadata source it prefers.

## Recursion

`BuiltInValidator` recurses into nested DataObjects and arrays of DataObject (declared with `#[ListOf]`). Errors surface with dot-path keys.

## Common mistakes

- Throwing on every validation failure with `fromArrayValidated()` when the call site wants to render field-level error messages — use `validate()` and read `ValidationResult` instead
- Expecting `Required` on a field that has a default value — the default applies before validation runs, so `Required` will pass for the default
- Putting expensive logic in a `Callback` rule — rules run for every field on every `validate()` call
