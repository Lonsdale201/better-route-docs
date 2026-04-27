---
title: UserSink
---

`BetterData\Sink\UserSink` writes a DataObject to `wp_users` + `wp_usermeta`.

## Methods

Mirrors `PostSink`:

```php
UserSink::toArgs(DataObject $dto, ?array $only = null): array
UserSink::toMeta(DataObject $dto, ?array $only = null): array
UserSink::insert(...): int
UserSink::update(...): int
UserSink::save(...): int
```

`save()` routes to `update()` (when DTO has positive `id`/`ID`) or `insert()`.

## Excluded fields (security)

`user_pass` and `user_activation_key` are **always** excluded from the sink output, even when the DTO declares them.

```php
final readonly class MemberDto extends DataObject {
    public function __construct(
        public int $id = 0,
        public string $user_login = '',
        public string $user_email = '',
        public string $user_pass = '',  // declared, but UserSink will silently drop it
    ) {}
}

$dto->saveAsUser();
// user_pass is NOT written. Use wp_set_password() for password changes.
```

The reason: passwords need salted hashing via `wp_hash_password()` and explicit handling outside the generic DTO round-trip (which would silently overwrite hashes with plaintext). Reset flows should use `wp_set_password($plain, $userId)` directly.

## Example

```php
final readonly class MemberDto extends DataObject {
    use HasWpSources, HasWpSinks;

    public function __construct(
        public int $id = 0,
        public string $user_login = '',
        public string $user_email = '',
        public string $display_name = '',

        #[MetaKey('first_name')]
        public string $firstName = '',

        #[MetaKey('last_name')]
        public string $lastName = '',
    ) {}
}

// Insert
$dto = MemberDto::fromArray($input);
$id = $dto->saveAsUser();

// Update with partial
$existing = MemberDto::fromUser($id);
$existing->with(['firstName' => 'Jane'])->saveAsUser(only: ['firstName']);
```

## Common mistakes

- Putting `user_pass` on the DTO and expecting it to round-trip — write side is intentionally a no-op; use `wp_set_password()`
- Passing `user_email` changes without WP's email-change confirmation flow — `UserSink` calls `wp_update_user()` directly, which bypasses some confirmation hooks
