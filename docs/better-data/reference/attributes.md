---
title: Attributes Reference
---

Quick reference for every attribute. See [Core → Attributes](../core/attributes) for narrative coverage.

## Field-mapping

| Attribute | Constructor | Used by | Notes |
|---|---|---|---|
| `#[MetaKey]` | `(string $key, ?string $type = null, bool $showInRest = false, bool $single = true, mixed $default = null, ?string $description = null, ?string $sanitize = null, ?string $authCapability = null, bool $encrypt = false)` | Sources, Sinks, MetaKeyRegistry | Maps a property to a WP meta key |
| `#[PostField]` | `(string $name)` | PostSource, PostSink | Maps a property to a `WP_Post` system field |
| `#[UserField]` | `(string $name)` | UserSource, UserSink | Maps a property to a `WP_User` system field |
| `#[TermField]` | `(string $name)` | TermSource, TermSink | Maps a property to a `WP_Term` system field |
| `#[Column]` | `(string $name)` | RowSource, RowSink | Maps a property to a `$wpdb` column |

## Type-shape

| Attribute | Constructor | Used by | Notes |
|---|---|---|---|
| `#[ListOf]` | `(string $class)` | DataObject hydration, sinks, Presenter | Element class for arrays |
| `#[DateFormat]` | `(string $format)` | Sinks | Override datetime format on writes |

## Security

| Attribute | Constructor | Used by | Notes |
|---|---|---|---|
| `#[Encrypted]` | `()` | Sources, Sinks, MetaKeyRegistry | AES-256-GCM at-rest |
| `#[Sensitive]` | `()` | Presenter | Excluded from output unless `includeSensitive` |

## Validation rules (under `BetterData\Validation\Rule\`)

| Attribute | Constructor | Pass condition |
|---|---|---|
| `#[Required]` | `()` | not null, not empty string, not empty array |
| `#[Email]` | `()` | `FILTER_VALIDATE_EMAIL` (skips null) |
| `#[Url]` | `()` | `FILTER_VALIDATE_URL` (skips null) |
| `#[Uuid]` | `()` | RFC 4122 v1–8 (skips null) |
| `#[Regex]` | `(string $pattern, ?string $message = null)` | `preg_match` matches (skips null) |
| `#[Min]` | `(int\|float $min)` | `>= $min`; non-numeric fails (skips null) |
| `#[Max]` | `(int\|float $max)` | `<= $max`; non-numeric fails (skips null) |
| `#[MinLength]` | `(int $min)` | strings/arrays `>= $min` (skips null) |
| `#[MaxLength]` | `(int $max)` | strings/arrays `<= $max` (skips null) |
| `#[OneOf]` | `(array $allowed)` | strict `in_array` (skips null) |

`Callback` is constructed programmatically (closures aren't valid attribute arguments):

```php
new BetterData\Validation\Rule\Callback(
    fn (mixed $value, string $field, DataObject $subject): ?string => ...
);
```

## Interaction matrix

| Combination | Effect |
|---|---|
| `#[MetaKey] #[Encrypted]` | Encrypted-at-rest meta. Recommended for keys, tokens. |
| `MetaKey(encrypt: true)` alone | Equivalent. `#[Encrypted]` and `MetaKey(encrypt: true)` are idempotent. |
| `#[MetaKey] #[Sensitive]` | Plaintext storage; hidden from Presenter unless explicitly included. |
| `#[Encrypted]` on `Secret` | Encrypted at rest **and** leak-proof in memory. |
| `#[MetaKey('_x', encrypt: true, showInRest: true)]` | `_doing_it_wrong` — REST consumers would receive ciphertext. Drop one of the two. |
| `#[MetaKey('_x', showInRest: true)]` no `authCapability` | `_doing_it_wrong` — silent 403 on REST writes. Set capability or drop `_`. |
| `#[PostField]` AND `#[MetaKey]` on the same field | `MetaKey` wins; `PostField` is silently ignored. Treat as configuration error. |
| `#[ListOf]` on a non-array property | Ignored — only arrays are coerced element-by-element. |
| `#[DateFormat]` on a non-datetime property | Ignored on writes. |
| `#[Sensitive]` on `Secret` | Double protection — Presenter excludes it; even if included, redacts to `'***'`. |

## Auto-detection (no attribute needed)

When a property name matches a known system field, the engines resolve it without an explicit attribute:

| Source | Auto-detected fields |
|---|---|
| `WP_Post` | `ID`, `post_author`, `post_date`, `post_date_gmt`, `post_content`, `post_title`, `post_excerpt`, `post_status`, `comment_status`, `ping_status`, `post_password`, `post_name`, `to_ping`, `pinged`, `post_modified`, `post_modified_gmt`, `post_content_filtered`, `post_parent`, `guid`, `menu_order`, `post_type`, `post_mime_type`, `comment_count` |
| `WP_User` | `ID`, `user_login`, `user_nicename`, `user_email`, `user_url`, `user_registered`, `user_status`, `display_name` |
| `WP_Term` | `term_id`, `name`, `slug`, `term_group`, `term_taxonomy_id`, `taxonomy`, `description`, `parent`, `count` |

The `id` (lowercase) property auto-aliases to `ID` (or `term_id` for terms).
