---
title: Secret
---

`BetterData\Secret` is a leak-proof container for sensitive strings — API keys, tokens, webhook secrets. The plaintext only escapes through the explicit `reveal()` call, so every leak path through serialization, dump, and string conversion is closed.

## Construction

```php
use BetterData\Secret;

$secret = new Secret('sk_live_abc123');
```

## Access

```php
$secret->reveal(): string
```

The single, deliberately explicit accessor for the plaintext. Every call site that needs the raw value calls `reveal()` — making it greppable in code review.

```php
$secret->equals(Secret|string $other): bool
```

Constant-time comparison. Accepts either another `Secret` or a raw string, so callers don't need to reveal one Secret to compare against another.

```php
$a = new Secret('abc');
$b = new Secret('abc');
$a->equals($b);   // true
$a->equals('abc'); // true
```

## What `Secret` blocks

| Path | Behavior |
|---|---|
| `(string) $secret` | Returns `'***'` |
| `json_encode($secret)` | Returns `'"***"'` (via `jsonSerialize`) |
| `var_dump($secret)` | Shows `value => '***'` (via `__debugInfo`) |
| `print_r($secret, true)` | Same — `__debugInfo` |
| `serialize($secret)` | **Throws** `SecretSerializationException` |
| `unserialize(...)` of a serialized Secret | **Throws** `SecretSerializationException` |
| Exception stack traces with Secret args | Shows `'***'` |
| `DataObject::toArray()` for a Secret field | Returns `'***'` |
| `Presenter::toArray()` / `toJson()` for a Secret field | Returns `'***'` (even when included via `includeSensitive`) |

`serialize` throws rather than redacting silently — silent lossy serialization of a credential is the worst of both outcomes (you lose the value AND don't notice the loss).

## What `Secret` does not block

`Secret` defends against accidental leaks through ordinary code paths. It does **not** defend against:

- **PHP reflection.** `Reflection::getValue()` on a private property always works. Reflection-based debuggers (Symfony VarDumper with custom casters, PsySH) can still see the plaintext.
- **Memory dumps.** PHP strings are immutable; "zeroing" isn't meaningful from PHP. Operate at the OS level if this is in scope.
- **Xdebug.** Step debugging shows everything.

`Secret` is a guardrail against accidental exposure (a `var_dump` left in production, an exception trace shipped to a log, a careless `json_encode($context)` in a controller). For determined introspection, no PHP-level container can help.

## Composition with `#[Encrypted]`

`#[Encrypted] public Secret $apiKey` is the recommended pattern for at-rest encryption + leak-proof memory:

```php
final readonly class ApiConfigDto extends DataObject {
    public function __construct(
        #[Encrypted]
        #[MetaKey('_api_key')]
        public ?Secret $apiKey = null,
    ) {}
}
```

- Storage: `bd:v1:<base64>` envelope (encrypted)
- In-memory: `Secret` instance (leak-proof)
- Read: hydrator decrypts → `TypeCoercer` wraps in `Secret`
- Write: sink reveals → encrypts → stores envelope
- `Presenter` output: `'***'` regardless of context

To use the plaintext at runtime, `reveal()` it explicitly:

```php
$key = $config->apiKey?->reveal();
wp_remote_post('https://api.example.com/charge', [
    'headers' => ['Authorization' => "Bearer {$key}"],
    'body'    => json_encode($payload),
]);
```

Inside a `Presenter::compute` closure, this is the auditable place to expose the plaintext (e.g., for an admin "show key" UI):

```php
->compute('apiKey', fn ($d) => $d->apiKey?->reveal())
```

## Secret in `with()`

`with()` preserves `Secret` instances through the merge, because the snapshot bypasses `toArray()`:

```php
$dto = ApiConfigDto::fromArray(['apiKey' => 'sk_live_abc']);
$updated = $dto->with(['someOtherField' => 'changed']);
$updated->apiKey->reveal();  // still 'sk_live_abc' — Secret survived
```

If you replace a `Secret` field directly, pass either a string (which `TypeCoercer` wraps) or a `Secret` instance:

```php
$dto->with(['apiKey' => 'new_key']);
$dto->with(['apiKey' => new Secret('new_key')]);
```

## Common mistakes

- Calling `(string) $secret` and using the result as a header value — gets `'***'`, the request will fail. Always `reveal()` explicitly.
- Logging `$dto` via `error_log(json_encode($dto))` — `Secret` fields appear as `'***'`. Add a `compute` step or log specific fields explicitly.
- Putting `serialize($secret)` in a session payload — throws. Store the encrypted envelope (or just the meta key reference) instead.
- Forgetting that `Presenter` always redacts `Secret` — `includeSensitive` doesn't change this; only `compute` with `reveal()` does.
