---
title: Exceptions
---

Every public exception in `BetterData\Exception\` and adjacent namespaces, with the conditions that fire each.

## DataObject hydration

### `DataObjectException`

Abstract base for hydration / type errors. Carries `getDataObjectClass()` and `getFieldName()`.

### `TypeCoercionException` extends `DataObjectException`

Thrown when `TypeCoercer` cannot coerce a value to the declared type.

- Static factories: `::for($dtoClass, $fieldName, $targetType, $value, $previous = null)`, `::unsupportedType($dtoClass, $fieldName, $description)`
- Common causes: union/intersection types, non-numeric string for numeric, malformed datetime, enum value not in case list, non-array for nested DataObject

### `MissingRequiredFieldException` extends `DataObjectException`

Thrown during hydration when a required constructor parameter has no value in the input data.

- Factory: `::for($dtoClass, $fieldName)`
- Common cause: PHP demoting earlier optional parameters to required because a later parameter has no default

### `UnknownFieldException` extends `DataObjectException`

Thrown when `only:` whitelist (with `strict: true`) names a field that doesn't exist on the constructor.

- Factory: `::forFields($dtoClass, $unknownFields, $availableFields)`
- Used by sinks and Presenter

## Validation

### `ValidationException`

Thrown by `fromArrayValidated()` and `ValidationResult::throwIfInvalid()`.

- Carries the `ValidationResult` instance
- `->errors()`: returns the same dict as `ValidationResult::errors`
- Factory: `::fromResult(ValidationResult)`

## Sinks

### `MissingIdentifierException`

Thrown when a sink update operation requires an identifier but the DTO doesn't carry one.

- Factory: `::forUpdate($dtoClass, $fieldName)`
- Common case: `PostSink::update($dto)` with `$dto->id === 0` and no `$postId` argument

## Sources

### `PostNotFoundException`, `UserNotFoundException`, `TermNotFoundException`

Thrown by `PostSource::hydrate`, `UserSource::hydrate`, `TermSource::hydrate` when the requested ID doesn't exist.

- Factory: `::forId($dtoClass, $id)`
- Note: `hydrateMany` does **not** throw — it silently skips missing IDs. Use single `hydrate()` calls when you need explicit error reporting.

## Request guards

### `RequestGuardException`

Abstract base for request-time guard failures.

### `NonceVerificationFailedException` extends `RequestGuardException`

Thrown by `RequestSource::requireNonce()` when `wp_verify_nonce()` fails.

- Factory: `::forAction($action)`

### `CapabilityCheckFailedException` extends `RequestGuardException`

Thrown by `RequestSource::requireCapability()` when `current_user_can()` returns false.

- Factory: `::for($capability)`

### `RequestParamCollisionException` extends `RequestGuardException`

Thrown by `RequestSource::noCollision()` and `BetterRouteBridge` when a route-owned field appears in a client-controlled bucket (body, JSON, query).

- Factory: `::forFields(list<string> $collidingFields)`

## Encryption

### `MissingEncryptionKeyException`

Thrown by `EncryptionEngine` when the key is unavailable or invalid.

- `::notDefined()` — `BETTER_DATA_ENCRYPTION_KEY` is not defined and no filter provides one
- `::invalidLength(int $bytes)` — key decoded successfully but isn't 32 bytes (AES-256 requires 32 bytes)
- `::decodingFailed()` — key value isn't valid base64

Fires at the first encrypt or decrypt call, not at boot.

### `DecryptionFailedException`

Thrown when `EncryptionEngine::decrypt()` fails.

- Factory: `::forKey($metaKey)` — generic message; doesn't leak whether the failure was tampering, missing rotation key, or version mismatch (no oracle leak)

## Secret

### `SecretSerializationException`

Thrown when `serialize()` is called on a `Secret` instance, or when a serialized payload claiming to be a `Secret` is `unserialize`d.

- `::forSerialize()` — silent lossy serialize is the worst outcome (lose the value AND don't notice). Throw instead.
- `::forUnserialize()` — same logic for the reverse

If you need to persist a `Secret` value across requests, use `#[Encrypted]` to store it as a meta key or option, not PHP serialization.

## Mapping to HTTP responses

`BetterRouteBridge` maps these exceptions to route errors automatically:

| Exception | Status | Code |
|---|---|---|
| `ValidationException` | 400 | `validation_failed` (with `details.fieldErrors`) |
| `RequestParamCollisionException` | 400 | `request_param_collision` |
| `RequestGuardException` (and subclasses) | 403 | `request_guard_failed` |
| `DataObjectException` (and subclasses) | 400 | `validation_failed` (with field name when available) |

For manual REST endpoints, catch and translate as needed (see [RequestSource](../sources/request-source) for a worked example).
