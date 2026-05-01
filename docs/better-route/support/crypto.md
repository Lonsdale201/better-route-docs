---
title: Crypto Utilities
---

`BetterRoute\Support\Crypto` *(v0.6.0)* is the shared crypto helper used by the new 0.6.0 primitives (JWKS verifier, HMAC signatures, single-use tokens) and exposed for handler-level code that needs the same building blocks.

The helper is intentionally small. It wraps PHP's existing primitives so the same hardened defaults apply everywhere — `random_bytes` for entropy, `hash_equals` for compare, strict base64url decoding that rejects malformed input.

## Constant-time compare

```php
use BetterRoute\Support\Crypto;

if (!Crypto::equals($expected, $candidate)) {
    throw new ApiException('Invalid token.', 401, 'invalid_token');
}
```

Backed by `hash_equals`. Use it for any comparison of secret-derived material (HMAC digests, signature bytes, token hashes).

## CSPRNG token generation

```php
$token = Crypto::token(32);                            // 32 bytes -> 43-char base64url
$hex   = Crypto::tokenHex(32);                         // 32 bytes -> 64-char hex
$b64   = Crypto::token(32, CryptoEncoding::Base64);    // standard base64
$b64u  = Crypto::token(32, CryptoEncoding::Base64Url); // URL-safe (default)
```

- `token(int $bytes = 32, string|CryptoEncoding $encoding = Base64Url): string` — `random_bytes($bytes)` then encoded.
- `tokenHex(int $bytes = 32): string` — convenience wrapper for hex output.
- Strings are accepted next to enum values (`'hex'`, `'base64'`, `'base64url'`); unknown values throw `RuntimeException`.

Use `Crypto::token()` for OAuth codes, magic-link tokens, password reset tokens, CSRF tokens — anywhere you need an unguessable string.

## Encoding helpers

```php
$encoded = Crypto::base64UrlEncode($raw);
$decoded = Crypto::base64UrlDecode($encoded);
$encoded = Crypto::encode($raw, CryptoEncoding::Hex);
```

`base64UrlDecode()` is **strict**:

- only the alphabet `[A-Za-z0-9_-]` and trailing `=` padding are accepted;
- internal `=` characters throw;
- payload lengths that cannot be valid base64url throw;
- malformed payloads throw `RuntimeException` instead of silently returning a corrupted string.

This is the decoder the JWKS verifier uses on every JWT segment, so attacker-controlled input never produces unexpected output.

## `CryptoEncoding` enum

```php
enum CryptoEncoding: string
{
    case Hex       = 'hex';
    case Base64    = 'base64';
    case Base64Url = 'base64url';
}
```

Used by `Crypto::token()` and `Crypto::encode()`. Strings are coerced to enum values on entry.

## Validation checklist

- `Crypto::equals('abc', 'abc')` returns `true`;
- `Crypto::token(32)` produces an unguessable 43-character base64url string;
- `Crypto::base64UrlDecode('!')` throws `RuntimeException` (alphabet violation);
- `Crypto::base64UrlDecode('AB=C')` throws `RuntimeException` (interior padding).

## Common mistakes

- Using `===` to compare HMAC digests. That is a timing oracle. Use `Crypto::equals()`.
- Calling `random_int` for tokens. Use `Crypto::token()` so the output goes through `random_bytes` and the encoding stays consistent across call sites.
- Using `base64_decode($input, true)` for JWT segments. The strict mode catches some violations but does not validate the URL-safe alphabet. `Crypto::base64UrlDecode()` does both.
