---
title: Sources Overview
---

Sources are the read path. Each one moves data from a WordPress shape (post, user, term, option, custom row, REST request) into a typed DataObject.

## Available sources

| Source | Reads from | Key signature |
|---|---|---|
| `PostSource` | `WP_Post` + `post_meta` | `hydrate(int\|WP_Post $post, string $dtoClass)` |
| `UserSource` | `WP_User` + `user_meta` | `hydrate(int\|WP_User $user, string $dtoClass)` |
| `TermSource` | `WP_Term` + `term_meta` | `hydrate(int\|WP_Term $term, string $dtoClass)` |
| `OptionSource` | `wp_options` | `hydrate(string $option, string $dtoClass, array $default = [])` |
| `RowSource` | `$wpdb` rows (`ARRAY_A` or object) | `hydrate(array\|object $row, string $dtoClass)` |
| `RequestSource` | `WP_REST_Request` (with guards) | `from($req)->...->into($dtoClass)` |

Every source ultimately delegates to `BetterData\Internal\AttributeDrivenHydrator`, which is WP-independent. You can unit-test DTO hydration without bootstrapping WordPress by feeding an `AttributeDrivenHydrator::hydrate()` call directly.

## Read flow

```
WP_Post / WP_User / array / WP_REST_Request
        ↓
{Post|User|Term|Option|Row|Request}Source::hydrate
        ↓
AttributeDrivenHydrator::hydrate
   ├── #[MetaKey] → fetch via metaFetcher closure
   │       ↓
   │   #[Encrypted] or MetaKey(encrypt: true)? → EncryptionEngine::decrypt
   ├── #[PostField] / #[UserField] / #[TermField] → lookup in system field map
   │       ↓
   │   timezone hint applied? → DateTimeImmutable($v, new DateTimeZone(...))
   └── auto-detect (property name matches known field)
        ↓
DataObject::fromArray
   └── TypeCoercer (string → int/float/bool/Enum/Secret/DateTime/nested DTO)
        ↓
   #[ListOf] → element-by-element coercion
        ↓
DTO instance
```

## Bulk hydration with cache prewarming

`PostSource`, `UserSource`, `TermSource` provide `hydrateMany()`:

```php
$products = PostSource::hydrateMany([1, 2, 3, 4, 5], ProductDto::class);
```

Under the hood:

- `PostSource::hydrateMany`: calls `_prime_post_caches($ids, true, true)` (one query for all posts) + `update_meta_cache('post', $ids)` (one query for all meta)
- `UserSource::hydrateMany`: calls `update_meta_cache('user', $ids)`
- `TermSource::hydrateMany`: calls `update_meta_cache('term', $ids)`

Result: 2 SQL queries for any number of posts, instead of N+1.

Invalid IDs are silently skipped — the returned list contains only successfully hydrated DTOs. Callers that need explicit error reporting should use single `hydrate()` calls.

## HasWpSources trait

Add the trait to a DTO to expose source shortcuts as static methods on the DTO class:

```php
use BetterData\Source\HasWpSources;

final readonly class ProductDto extends DataObject
{
    use HasWpSources;
    // ...
}

ProductDto::fromPost(42);                 // PostSource::hydrate
ProductDto::fromPosts([1, 2, 3]);          // PostSource::hydrateMany
ProductDto::fromUser($wpUser);             // UserSource::hydrate
ProductDto::fromUsers($userIds);           // UserSource::hydrateMany
ProductDto::fromTerm($termId);             // TermSource::hydrate
ProductDto::fromTerms($termIds);           // TermSource::hydrateMany
ProductDto::fromOption('my_settings');     // OptionSource::hydrate
ProductDto::fromRow($wpdbRow);             // RowSource::hydrate
ProductDto::fromRows($wpdbRows);           // RowSource::hydrateMany
ProductDto::fromRequest($wpRestRequest);   // RequestSource::from(...)->into(...)
```

The trait is opt-in. Skip it if you prefer to call sources directly (e.g., for cross-cutting concerns or when the DTO class is loaded outside WP).

## Common mistakes

- Using a single `hydrate()` call inside a loop — pay the N+1 query cost; switch to `hydrateMany()`
- Expecting a missing post ID to throw — `hydrate()` does throw `PostNotFoundException`, but `hydrateMany()` silently skips invalid IDs
- Calling `fromPost($postObject)` before WP fully initializes — works as long as the relevant `_prime_*_caches` machinery is loaded; `init` hook is the safe baseline
