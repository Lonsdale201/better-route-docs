---
title: OptionSource
---

`BetterData\Source\OptionSource` hydrates a DataObject from a single WordPress option (typically an array stored under one option key).

## Method

```php
OptionSource::hydrate(string $option, string $dtoClass, array $default = []): DataObject
```

- Reads `get_option($option)`. If missing or non-array, uses `$default`.
- Passes the array straight to `$dtoClass::fromArray()`.

## No system/meta split

Options are flat — there's no equivalent of `post_meta`. Use plain property names that match the array keys:

```php
final readonly class SettingsDto extends DataObject {
    use HasWpSources;

    public function __construct(
        public string $contactEmail = '',
        public bool $maintenanceMode = false,
        public int $cacheTtl = 300,

        #[Encrypted]
        public ?Secret $apiKey = null,
    ) {}
}

$settings = SettingsDto::fromOption('myplugin_settings');

// With explicit defaults:
$settings = SettingsDto::fromOption(
    'myplugin_settings',
    default: ['cacheTtl' => 600, 'maintenanceMode' => false],
);
```

## Encrypted options

`#[Encrypted]` works on options too. Encrypted values are stored as `bd:v1:...` envelopes inside the option array; the source decrypts before coercion.

The corresponding write path is [OptionSink](../sinks/option-sink), which calls `Secret::reveal()` on write (option storage already trusts the value, so revealing the plaintext to encrypt it is the only way to persist).

## Common mistakes

- Storing the full DTO at the top level vs. a nested key — `OptionSource` expects the option value to be the array of fields directly. If you store `update_option('foo', ['data' => [...]])`, you'd hydrate from `['data' => ...]` not `'foo'`
- Forgetting that `get_option` returns `false` when missing — `OptionSource` defends against this and uses `$default`, but custom unwrapping logic might not
