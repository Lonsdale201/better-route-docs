---
title: Attributes
---

Attributes attach metadata to constructor parameters so the engines (`AttributeDrivenHydrator`, `SinkProjection`, `MetaKeyRegistry`, `Presenter`) know how to map between PHP types and WordPress storage.

All attributes target `Attribute::TARGET_PARAMETER | Attribute::TARGET_PROPERTY` and live under `BetterData\Attribute\`.

## Field-mapping attributes

### `#[MetaKey]`

Maps a property to a WordPress meta key. Used by Post / User / Term / Option sources and sinks.

```php
new MetaKey(
    string $key,                      // required — e.g. '_price'
    ?string $type = null,             // JSON Schema type; auto-inferred if null
    bool $showInRest = false,         // expose to REST via register_meta()
    bool $single = true,              // single-value vs array meta
    mixed $default = null,            // fallback when meta missing
    ?string $description = null,
    ?string $sanitize = null,         // callable name (e.g. 'sanitize_text_field')
    ?string $authCapability = null,   // user_can($userId, $cap, $objectId) check
    bool $encrypt = false,            // AES-256-GCM at rest
)
```

Hydration: read via `get_post_meta()` / `get_user_meta()` / `get_term_meta()` / `get_option()` depending on the source.

Sink: write via `update_post_meta()` etc.; null values trigger `delete_post_meta()` unless `skipNullDeletes: true`.

Registration: `MetaKeyRegistry::register()` calls `register_meta()` with all params. See [MetaKeyRegistry](../registration/meta-key-registry).

### `#[PostField]`, `#[UserField]`, `#[TermField]`

Map a property to a system field on `WP_Post` / `WP_User` / `WP_Term` when the property name doesn't match the underlying field name.

```php
#[PostField('post_title')]
public string $title;

#[PostField('post_date_gmt')]
public ?\DateTimeImmutable $publishedAt;
```

Optional when the property name matches the system field. The `id` property auto-aliases to the appropriate primary key (`ID` on posts/users, `term_id` on terms).

### `#[Column]`

Maps a property to a custom database column (used by `RowSource` / `RowSink`). Optional when the property name matches the column name.

```php
#[Column('order_id')]
public int $orderId;
```

## Type-shape attributes

### `#[ListOf]`

Declares the element type for an array property. The hydrator coerces each element via `$class::fromArray()`.

```php
#[ListOf(LineItemDto::class)]
public array $items = [];
```

- Element-by-element coercion
- Already-instance elements pass through
- Sink path: nested DataObjects unwrap to arrays via `toArray()`
- Presenter: nested DataObjects render recursively

`$class` need not extend `DataObject` — anything with a static `fromArray()` works.

### `#[DateFormat]`

Overrides datetime serialization format on the sink path.

```php
#[DateFormat('U')]
public \DateTimeImmutable $scheduledAt;
```

Defaults:

- Post / User / Term system date fields → MySQL `'Y-m-d H:i:s'`, with UTC conversion for `*_gmt` fields
- Meta / option / row columns → ISO 8601 (`DateTimeInterface::ATOM`)

`#[DateFormat]` only applies on writes. On reads, `TypeCoercer` parses the stored string back into `DateTimeImmutable` regardless of format.

## Security attributes

### `#[Encrypted]`

Marks a field for AES-256-GCM at-rest encryption.

```php
#[Encrypted]
#[MetaKey('_api_key')]
public ?Secret $apiKey = null;
```

- Stored value: `bd:v1:base64(iv || ciphertext || tag)` envelope
- Read: hydrator detects the prefix and decrypts via `EncryptionEngine`
- Write: sink reveals the value (and `Secret::reveal()` if applicable), encrypts, stores the envelope
- Idempotent with `MetaKey(encrypt: true)` — both paths trigger the same engine

Requires `BETTER_DATA_ENCRYPTION_KEY` to be defined. See [Encryption](../security/encryption).

### `#[Sensitive]`

Marks a property for presentation-layer redaction.

```php
#[Sensitive]
public ?string $internalNote = null;
```

- Hydration and sinks: unaffected
- Presenter: excluded from `toArray()` / `toJson()` by default
- Opt-in inclusion: `Presenter::for($dto)->includeSensitive(['internalNote'])`

`#[Sensitive]` is a visibility gate. `Secret` is a leak-proof container. They're orthogonal:

```php
#[Sensitive]            public ?string $ssn = null;       // PII, plain string
#[Encrypted]            public ?Secret $apiKey = null;     // secret at rest, leak-proof in memory
```

## Validation rule attributes

Validation rules also live in `BetterData\Validation\Rule\`. They're attribute-targeted:

```php
use BetterData\Validation\Rule;

#[Rule\Required, Rule\MinLength(2), Rule\MaxLength(200)]
public string $title = '';

#[Rule\Email]
public ?string $email = null;
```

See [Validation](validation) for the full rule list.

## Interaction matrix

| Combination | Effect |
|---|---|
| `#[MetaKey] #[Encrypted]` | Encrypted-at-rest meta. Recommended for secret keys, tokens. |
| `#[MetaKey(encrypt: true)]` alone | Same effect; `#[Encrypted]` and `MetaKey(encrypt: true)` are idempotent. |
| `#[MetaKey] #[Sensitive]` | Stored plaintext, hidden from Presenter output unless explicitly included. |
| `#[Encrypted]` on a `Secret`-typed field | Encrypted at rest **and** leak-proof in memory. |
| `#[MetaKey('_x', encrypt: true, showInRest: true)]` | `_doing_it_wrong` warning at registration — WP core's REST read path bypasses decryption and would expose ciphertext. Drop `showInRest` or remove `_` prefix. |
| `#[MetaKey('_x', showInRest: true)]` without `authCapability` | `_doing_it_wrong` warning — protected meta keys default to silent 403 on REST writes. Set `authCapability` or drop `_`. |
| `#[PostField] #[MetaKey]` together | `MetaKey` wins; `PostField` is silently ignored. Treat as configuration error. |
| `#[ListOf]` on a non-array property | Ignored — only arrays are coerced element-by-element. |
| `#[DateFormat]` on a non-datetime property | Ignored on writes. |

## Without attributes

Bare DTOs with property names matching known system fields hydrate without attributes:

```php
final readonly class PostMeta extends DataObject
{
    public function __construct(
        public int $id = 0,
        public string $post_title = '',
        public string $post_status = '',
    ) {}
}

PostMeta::fromPost(42); // works — names match WP_Post fields
```

`#[PostField]` is only required when the property name diverges from the system field name.
