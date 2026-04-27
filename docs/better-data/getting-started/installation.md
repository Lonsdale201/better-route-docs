---
title: Installation
---

## Runtime requirements

- PHP **8.3+** (readonly classes, typed class constants, `#[\Override]`, `json_validate()`)
- WordPress (no version floor enforced — sources fall back gracefully when optional WP functions are absent)
- `ext-openssl` only when you use `#[Encrypted]` (ships with every modern PHP build)

## Composer setup

The package is not on Packagist yet. Install it via a Composer VCS repository pointing at the public GitHub repo:

```json
{
  "require": {
    "better-data/better-data": "^1.0"
  },
  "repositories": [
    {
      "type": "vcs",
      "url": "https://github.com/Lonsdale201/better-data"
    }
  ],
  "prefer-stable": true
}
```

Then:

```bash
composer update better-data/better-data
```

After the package lands on Packagist you can drop the `repositories` block and keep only `require`.

## Encryption key (only if you use `#[Encrypted]`)

Generate a 32-byte (AES-256) base64 key once:

```bash
php -r "echo base64_encode(random_bytes(32)).PHP_EOL;"
```

Add to `wp-config.php`:

```php
define('BETTER_DATA_ENCRYPTION_KEY', '<paste-key>');
// Optional, used during key rotation:
define('BETTER_DATA_ENCRYPTION_KEY_PREVIOUS', '<old-key>');
```

If `#[Encrypted]` is used without a key, the first encrypt/decrypt call throws `MissingEncryptionKeyException` — loud failure, never silent plaintext storage.

## Local quality commands

```bash
composer test
composer analyse
composer cs-fix
composer cs-check
```

## Validation checklist

- `composer show better-data/better-data` resolves correctly
- `composer test` passes
- DTOs are declared `final readonly class` and extend `BetterData\DataObject`
- `BETTER_DATA_ENCRYPTION_KEY` is defined when any DTO uses `#[Encrypted]`
