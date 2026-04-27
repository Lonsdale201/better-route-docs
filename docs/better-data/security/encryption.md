---
title: Encryption (#[Encrypted])
---

`BetterData\Attribute\Encrypted` marks a field for AES-256-GCM at-rest encryption. The sink encrypts on write; the source decrypts on read. Plaintext only exists inside the property at runtime.

## Setup

Generate a 32-byte (AES-256) base64 key once:

```bash
php -r "echo base64_encode(random_bytes(32)).PHP_EOL;"
```

Add to `wp-config.php`:

```php
define('BETTER_DATA_ENCRYPTION_KEY', '<paste-key>');
```

If `#[Encrypted]` is used without a key, the first encrypt or decrypt call throws `MissingEncryptionKeyException` — loud failure, never silent plaintext storage.

A filter `better_data_encryption_key` is also accepted for consumers that prefer not to use `define()`.

## Declaration

```php
use BetterData\Attribute\Encrypted;
use BetterData\Attribute\MetaKey;
use BetterData\Secret;

final readonly class ApiConfigDto extends DataObject {
    public function __construct(
        #[Encrypted]
        #[MetaKey('_api_key')]
        public ?Secret $apiKey = null,
    ) {}
}
```

`#[Encrypted]` works with every sink that routes through meta storage (Post / User / Term meta) plus Option storage. It does not apply to system fields (`post_title`, `user_email`, etc.) — meta is the canonical place for encrypted blobs.

## Envelope format

Encrypted values are stored as:

```
bd:v1:<base64 of (iv || ciphertext || tag)>
```

- `bd:v1:` — version prefix; the engine refuses to decrypt anything without it
- `iv` — 12 random bytes per encryption
- `ciphertext` — AES-256-GCM
- `tag` — 16 bytes, authenticates the IV + ciphertext

The version prefix lets future releases roll out new envelopes without breaking existing data.

## Read flow

```
get_post_meta($id, '_api_key', true) → 'bd:v1:<...>'
        ↓ (AttributeDrivenHydrator)
EncryptionEngine::decrypt() → 'sk_live_abc'
        ↓ (TypeCoercer; target is Secret)
new Secret('sk_live_abc')
        ↓
$dto->apiKey is a Secret instance
```

## Write flow

```
$dto->apiKey is Secret('sk_live_abc')
        ↓ (SinkProjection::prepareValue)
Secret::reveal() → 'sk_live_abc'
        ↓ (#[Encrypted] detected on the parameter)
EncryptionEngine::encrypt('sk_live_abc') → 'bd:v1:<...>'
        ↓
update_post_meta($id, '_api_key', wp_slash('bd:v1:<...>'))
```

## Idempotency with `MetaKey(encrypt: true)`

Setting `MetaKey('_x', encrypt: true)` and `#[Encrypted]` on the same field is safe — both flags trigger the same engine, no double-encryption.

```php
// Either of these works; both together is fine
#[MetaKey('_x', encrypt: true)]
public ?Secret $a = null;

#[MetaKey('_y'), Encrypted]
public ?Secret $b = null;

#[MetaKey('_z', encrypt: true), Encrypted]   // idempotent
public ?Secret $c = null;
```

Prefer `#[Encrypted]` as the explicit attribute for readability.

## Key rotation

To rotate keys:

1. Define the **new** key as `BETTER_DATA_ENCRYPTION_KEY` and the **old** key as `BETTER_DATA_ENCRYPTION_KEY_PREVIOUS`:

   ```php
   define('BETTER_DATA_ENCRYPTION_KEY',          'base64-NEW-key');
   define('BETTER_DATA_ENCRYPTION_KEY_PREVIOUS', 'base64-OLD-key');
   ```

2. Deploy. From this point:
   - Writes encrypt with the new key
   - Reads try the new key first; if decryption fails, fall back to the previous key

3. Run a one-shot migration that re-encrypts every encrypted field with the new key. For each DTO carrying `#[Encrypted]` fields:

   ```php
   $dto = MyDto::fromPost($id);
   $dto->with([])->saveAsPost();   // no actual changes; the save re-encrypts with the current primary
   ```

4. Once you're confident every value has been re-encrypted, remove `BETTER_DATA_ENCRYPTION_KEY_PREVIOUS` from `wp-config.php` on the next deploy.

## Exceptions

| Class | When |
|---|---|
| `MissingEncryptionKeyException::notDefined()` | `BETTER_DATA_ENCRYPTION_KEY` is undefined and no filter provides one |
| `MissingEncryptionKeyException::invalidLength($bytes)` | Key decoded successfully but isn't 32 bytes |
| `MissingEncryptionKeyException::decodingFailed()` | Key value isn't valid base64 |
| `DecryptionFailedException::forKey($metaKey)` | Stored ciphertext fails to decrypt — tampered, missing rotation key, or unexpected envelope version. Generic message; no oracle leak. |

The exceptions fire at the first encrypt/decrypt call, not at boot. An app with `#[Encrypted]` fields in its DTOs but no encrypted reads/writes runs fine without a key — it only fails when someone actually saves or reads an encrypted field.

## REST exposure guard

`MetaKeyRegistry::register()` warns via `_doing_it_wrong` when an encrypted meta key is registered with `showInRest: true`. Reason: WordPress core's REST read path calls `get_post_meta()` directly and bypasses the `EncryptionEngine`. Without the guard, REST consumers would get the raw `bd:v1:...` ciphertext.

Solutions:

- Drop `showInRest: true` and expose the field via a custom REST endpoint that uses better-data's hydration
- Or move the field to a non-`_`-prefixed key and treat it as non-secret

## Threats addressed

- **Plaintext at rest in `wp_postmeta` / `wp_options`.** Every `#[Encrypted]` field is stored as ciphertext.
- **Database dumps.** A backup or export contains only envelopes; without the key, the values are indistinguishable from random data.
- **Casual leakage.** A query like `SELECT meta_value FROM wp_postmeta WHERE meta_key = '_api_key'` returns ciphertext, not the secret.

## Threats NOT addressed

- **Compromised host.** If an attacker reads `wp-config.php`, they have the key and can decrypt everything. Encrypt at the application layer, not at the volume.
- **Vault integration.** `better-data` reads the key from a constant or filter. Distribution to the constant (HashiCorp Vault, AWS Secrets Manager, GitHub Actions secrets) is the consumer's responsibility.
- **HSM.** Out of scope. The key is a base64 string in PHP memory.
- **Forward secrecy / log tampering.** Encrypted fields are values, not transport. TLS, log integrity, and SIEM are separate concerns.

## Common mistakes

- Pairing `#[Encrypted]` with `MetaKey(showInRest: true)` — `_doing_it_wrong` fires; REST consumers see ciphertext. Use a custom endpoint instead.
- Storing the encryption key in source control — defeats the entire purpose. Inject from environment / vault.
- Rotating without `_PREVIOUS` set — existing encrypted reads will throw `DecryptionFailedException`.
- Expecting encryption to make a field non-searchable in WP — yes, but also non-`meta_query`-able. Encrypted meta works for retrieval-by-ID but not for `WP_Query`'s meta filtering.
