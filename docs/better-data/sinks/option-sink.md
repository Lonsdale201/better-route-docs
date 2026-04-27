---
title: OptionSink
---

`BetterData\Sink\OptionSink` writes a DataObject to a single WordPress option (typically as an array).

## Methods

```php
OptionSink::toArray(DataObject $dto, ?array $only = null, bool $strict = false): array
OptionSink::save(DataObject $dto, string $option, ?array $only = null, ?bool $autoload = null, bool $strict = false): bool
```

## Projection: `toArray()`

Returns the option-storage-ready array. Unlike `PostSink`, there's no system/meta split — options are flat.

`toArray()` differs from `DataObject::toArray()` in two important ways:

| Behavior | `DataObject::toArray()` | `OptionSink::toArray()` |
|---|---|---|
| `Secret` field | Redacts to `'***'` | **Calls `Secret::reveal()`** to get plaintext |
| `#[Encrypted]` field | Returns plaintext (in-memory state) | Encrypts via `EncryptionEngine` if attribute is set |

The reasoning: option storage is the destination for the value, so the `Secret`'s plaintext must be written. `#[Encrypted]` then re-wraps it in the `bd:v1:...` envelope before persistence.

## Convenience: `save()`

```php
$dto->saveAsOption('myplugin_settings');
$dto->saveAsOption('myplugin_settings', autoload: false);

// Partial update — reads existing option, merges projection
$dto->saveAsOption('myplugin_settings', only: ['cacheTtl']);
```

When `$only` is set, `save()` reads the existing option, merges the projection over it, and calls `update_option()` with the merged result. This is a true partial update — fields outside `$only` keep their stored values.

## Example

```php
final readonly class SettingsDto extends DataObject {
    use HasWpSources, HasWpSinks;

    public function __construct(
        public string $contactEmail = '',
        public bool $maintenanceMode = false,
        public int $cacheTtl = 300,

        #[Encrypted]
        public ?Secret $apiKey = null,
    ) {}
}

// Save full settings
$settings = SettingsDto::fromArray($input);
$settings->saveAsOption('myplugin_settings');

// Update only cacheTtl, keep everything else as stored
$settings->with(['cacheTtl' => 600])->saveAsOption('myplugin_settings', only: ['cacheTtl']);
```

## Encrypted options

The full encryption flow:

```
Secret('sk_live_abc')
    ↓ (OptionSink::save)
Secret::reveal() → 'sk_live_abc'
    ↓ (#[Encrypted] detected)
EncryptionEngine::encrypt('sk_live_abc') → 'bd:v1:base64(...)'
    ↓
update_option('myplugin_settings', ['apiKey' => 'bd:v1:...', ...])
```

On read:

```
get_option('myplugin_settings') → ['apiKey' => 'bd:v1:...', ...]
    ↓ (OptionSource hydration)
'bd:v1:...' detected → EncryptionEngine::decrypt() → 'sk_live_abc'
    ↓ (TypeCoercer: target type is Secret)
new Secret('sk_live_abc')
    ↓
$dto->apiKey is a Secret instance
```

## Common mistakes

- Passing `$only` for first-write — there's no existing option to merge into; the result is a partial-only payload, missing fields will be absent on subsequent reads
- Expecting `save()` to overwrite the entire option even with `$only` set — by design, `$only` does a merge to preserve unrelated fields
- Forgetting `$autoload` — pass `autoload: false` for options larger than a few KB or rarely-read options to keep them out of the autoloaded option cache
