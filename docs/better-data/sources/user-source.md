---
title: UserSource
---

`BetterData\Source\UserSource` hydrates a DataObject from a `WP_User` plus its `user_meta`.

## Methods

```php
UserSource::hydrate(int|\WP_User $user, string $dtoClass): DataObject
UserSource::hydrateMany(array $userIds, string $dtoClass): array
```

`hydrate()` throws `UserNotFoundException` for missing IDs. `hydrateMany()` silently skips missing IDs.

## Auto-detected fields

`ID`, `user_login`, `user_nicename`, `user_email`, `user_url`, `user_registered`, `user_status`, `display_name`.

`user_registered` is treated as UTC.

## Security: excluded fields

`user_pass` and `user_activation_key` are intentionally excluded from auto-detection. To include them, declare them explicitly with `#[UserField]`:

```php
#[UserField('user_pass')]
public string $passwordHash = '';
```

Even then, the **sink** ignores these fields on write — passwords must go through `wp_set_password()` or a dedicated write path. See [UserSink](../sinks/user-sink).

## Bulk hydration

```php
$users = UserSource::hydrateMany($userIds, MemberDto::class);
```

Calls `update_meta_cache('user', $ids)` once and hydrates each user.

## Example

```php
final readonly class MemberDto extends DataObject {
    use HasWpSources;

    public function __construct(
        public int $id = 0,
        public string $user_login = '',
        public string $user_email = '',
        public string $display_name = '',

        #[MetaKey('first_name')]
        public string $firstName = '',

        #[MetaKey('last_name')]
        public string $lastName = '',

        #[MetaKey('billing_country')]
        public string $billingCountry = '',
    ) {}
}

$member = MemberDto::fromUser(get_current_user_id());
$members = MemberDto::fromUsers([12, 24, 36]);
```

## Common mistakes

- Declaring `user_pass` expecting reads/writes to round-trip — the sink will silently drop it on write
- Confusing `display_name` (auto-detected) with `nickname` (a meta key — needs `#[MetaKey('nickname')]`)
