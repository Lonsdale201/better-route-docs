---
title: AI Agent Skills
sidebar_position: 99
---

Structured skills an AI agent needs to work effectively with the `better-data` library. Each skill describes a specific capability, when to use it, and the exact API surface.

Aligned with the **v1.0.0** release. See [Release Notes — v1.0.0](release-notes/v1.0.0).

## Skill: Install better-data

**When:** The user wants to add `better-data` to a WordPress project.

**Requirements:**
- PHP `^8.3`
- WordPress with REST API
- Composer
- `ext-openssl` only when `#[Encrypted]` is used

**composer.json:**
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

**Encryption key (only if needed):**
```bash
php -r "echo base64_encode(random_bytes(32)).PHP_EOL;"
```
```php
// wp-config.php
define('BETTER_DATA_ENCRYPTION_KEY', '<paste-key>');
```

**Verification:**
```bash
composer show better-data/better-data
```

---

## Skill: Declare a DataObject

**When:** The user wants typed, immutable data with WP-aware hydration.

**Steps:**
1. Create a `final readonly class` extending `BetterData\DataObject`.
2. Use constructor promotion. **Every parameter must have a default.**
3. Apply attributes for non-trivial mappings (`#[MetaKey]`, `#[PostField]`, `#[Encrypted]`, `#[Sensitive]`, `#[ListOf]`).
4. Add traits as convenience: `use HasWpSources;` for read shortcuts, `use HasWpSinks;` for write shortcuts.

**Example:**
```php
use BetterData\Attribute\Encrypted;
use BetterData\Attribute\MetaKey;
use BetterData\DataObject;
use BetterData\Secret;
use BetterData\Sink\HasWpSinks;
use BetterData\Source\HasWpSources;
use BetterData\Validation\Rule;

final readonly class ProductDto extends DataObject {
    use HasWpSources;
    use HasWpSinks;

    public function __construct(
        public int $id = 0,
        #[Rule\Required, Rule\MaxLength(200)]
        public string $post_title = '',
        public string $post_status = 'publish',
        public string $post_type = 'product',

        #[MetaKey('_price', type: 'number'), Rule\Min(0)]
        public float $price = 0.0,

        #[MetaKey('_api_key'), Encrypted]
        public ?Secret $apiKey = null,
    ) {}
}
```

**Rules:**
- `final readonly class` — non-negotiable; immutability is load-bearing
- Trailing constructor parameters need defaults — PHP demotes earlier defaults to "required" otherwise
- Auto-detection works when property names match WP fields (`id`, `post_title`, `post_status`, etc.); attributes are only required when names diverge

---

## Skill: Hydrate from WP storage

**When:** The user wants to load a DTO from a post / user / term / option / row.

**API:**
```php
ProductDto::fromPost(int|WP_Post $p): ProductDto
ProductDto::fromPosts(array $ids): list<ProductDto>     // 2 SQL queries for any N
ProductDto::fromUser(int|WP_User $u): UserDto
ProductDto::fromUsers(array $ids): list<UserDto>
ProductDto::fromTerm(int|WP_Term $t): TermDto
ProductDto::fromTerms(array $ids): list<TermDto>
ProductDto::fromOption(string $option, array $default = []): SettingsDto
ProductDto::fromRow(array|object $row): RowDto
ProductDto::fromRows(iterable $rows): list<RowDto>      // streaming friendly
ProductDto::fromRequest(WP_REST_Request $r): Dto
```

Add `use HasWpSources;` to the DTO to expose these shortcuts.

**Bulk fetches** are 2 queries (post + meta caches) regardless of N — use them inside loops.

**Errors:**
- `fromPost(99999)` — throws `PostNotFoundException` if missing
- `fromPosts([99999])` — silently skips missing IDs

---

## Skill: Hydrate from WP_REST_Request with guards

**When:** A REST endpoint should hydrate a DTO from the request after enforcing nonce / capability / collision checks.

**Pattern:**
```php
use BetterData\Source\RequestSource;

$dto = RequestSource::from($request)
    ->requireNonce('save_settings')
    ->requireCapability('manage_options')
    ->bodyOnly()                  // or jsonOnly() / queryOnly() / urlOnly()
    ->noCollision(['id'])         // route-owned fields can't appear in body/query
    ->into(SettingsDto::class);
```

**Guards run in registration order at `into()` time.**

**Errors:**
- `NonceVerificationFailedException` — bad nonce
- `CapabilityCheckFailedException` — missing capability
- `RequestParamCollisionException` — route-owned field appears in body/query

---

## Skill: Persist via sinks

**When:** The user wants to write a DTO back to WordPress.

**Convenience methods (apply `wp_slash()`):**
```php
$dto->saveAsPost(?array $only = null, bool $strict = false, bool $skipNullDeletes = false): int
$dto->saveAsUser(?array $only = null, ...): int
$dto->saveAsTerm(?array $only = null, ...): int
$dto->saveAsOption(string $option, ?array $only = null, ?bool $autoload = null, ...): bool
$dto->saveAsRow(\wpdb $wpdb, string $table, array $where = [], ?array $only = null, ...): int
```

**Projection methods (no WP calls, no slashing — for testing or custom flows):**
```php
$dto->toPostArgs(?array $only = null): array
$dto->toUserArgs(?array $only = null): array
PostSink::toMeta($dto, ?$only): array      // ['write' => [...], 'delete' => [...]]
$dto->toOptionArray(?array $only = null): array
$dto->toRowArray(?array $only = null): array
```

**Common options:**
- `only: [...]` — whitelist; other fields ignored
- `strict: true` — `UnknownFieldException` on typo in `only`
- `skipNullDeletes: true` — null in DTO leaves storage untouched (PATCH semantics). Default: null triggers `delete_post_meta()`.

**Excluded fields:**
- `UserSink`: always excludes `user_pass`, `user_activation_key`. Use `wp_set_password()` for passwords.
- `TermSink`: always excludes `term_taxonomy_id`, `count`.

---

## Skill: Validate

**When:** The user wants to enforce rules beyond shape.

**Available rules** (under `BetterData\Validation\Rule\`):
`#[Required]`, `#[Email]`, `#[Url]`, `#[Uuid]`, `#[Regex($pattern, ?$message)]`, `#[Min($n)]`, `#[Max($n)]`, `#[MinLength($n)]`, `#[MaxLength($n)]`, `#[OneOf($allowed)]`. `Callback` is constructed programmatically.

**Three usage modes:**
```php
// Non-throwing — read errors and decide
$result = $dto->validate();
if (!$result->isValid()) {
    foreach ($result->flatten() as $line) error_log($line);
}

// Throwing on failure — for fail-fast paths
$dto->validate()->throwIfInvalid();

// Hydrate + validate in one — throws on either failure
$dto = ProductDto::fromArrayValidated($data);
```

**ValidationResult:**
- `->errors` — `['fieldPath' => list<string>]`
- `->errorsFor('field')`, `->firstError('field')`, `->flatten()`, `->isValid()`, `->throwIfInvalid()`

**Short-circuit:** the first failing rule on a field stops further rules on that field — no `Required → Email → MinLength` cascade for one empty input.

---

## Skill: Present a DataObject

**When:** The user wants a context-specific output shape (REST / admin / email / CSV).

**Pattern:**
```php
use BetterData\Presenter\PresentationContext;
use BetterData\Presenter\Presenter;

$out = Presenter::for($dto)
    ->context(PresentationContext::rest())
    ->only(['id', 'title', 'priceFormatted'])
    ->compute('priceFormatted', fn ($p) => wc_price($p->price))
    ->rename('post_title', 'title')
    ->hideUnlessCan('cost', 'manage_woocommerce')
    ->formatDate('createdAt', 'F j, Y', as: 'createdReadable')
    ->formatCurrency('price', as: 'priceDisplay')
    ->includeSensitive(['internalNote'])    // opt-in for #[Sensitive] fields
    ->toJson();
```

**Operation order:** collect → preset → compute → only → hide → rename. Sensitive/Secret redaction runs before `only`/`hide`.

**Terminal methods:** `->toArray(): array`, `->toJson(?int $flags = null): string`. `toJson` always forces `JSON_THROW_ON_ERROR`.

**Collections:**
```php
Presenter::forCollection($dtos)->context(...)->compute(...)->toArray();
```

**Subclass for reuse:**
```php
final class ProductPresenter extends Presenter {
    protected function configure(): void {
        $this->rename('post_title', 'title')
             ->compute('priceFormatted', fn ($p) => wc_price($p->price));
    }
}
```

---

## Skill: Use security primitives

**Three orthogonal tools:**

| Tool | Concern | Applies to |
|---|---|---|
| `Secret` (type) | Memory leak prevention | `public Secret $apiKey` — blocks `__toString`, `json_encode`, `var_dump`, `print_r`, `serialize` (throws) |
| `#[Sensitive]` (attribute) | PII presentation default-redaction | `#[Sensitive] public string $note` — Presenter excludes unless `includeSensitive()` opts in |
| `#[Encrypted]` (attribute) | At-rest AES-256-GCM | `#[Encrypted] public Secret $apiKey` — sink encrypts on write, source decrypts on read |

**Combination patterns:**
```php
#[Encrypted] public ?Secret $apiKey = null;          // encrypted at rest + leak-proof in memory
#[Sensitive] public ?string $internalNote = null;    // plain text, hidden from Presenter by default
#[Sensitive] #[Encrypted] public ?Secret $bankToken; // double protection
```

**Rules:**
- `Secret::reveal()` is the only way to get the plaintext. Call sites are auditable.
- `#[Encrypted]` requires `BETTER_DATA_ENCRYPTION_KEY` defined in `wp-config.php` (32 random bytes, base64).
- `MetaKeyRegistry` warns (`_doing_it_wrong`) on `MetaKey('_x', encrypt: true, showInRest: true)` — WP's REST read path bypasses decryption.
- Key rotation: define `BETTER_DATA_ENCRYPTION_KEY_PREVIOUS`; reads try primary then previous; writes always use primary.

---

## Skill: Register meta keys

**When:** The user wants `register_meta()` to expose meta keys to WordPress.

**Pattern:**
```php
use BetterData\Registration\MetaKeyRegistry;

add_action('init', function (): void {
    register_post_type('product', [...]);
    MetaKeyRegistry::register(ProductDto::class, 'post', 'product');
});
```

**Two derivative projections:**
```php
$schema = MetaKeyRegistry::toJsonSchema(ProductDto::class);   // root-object JSON Schema
$args   = MetaKeyRegistry::toRestArgs(ProductDto::class);     // for register_rest_route(['args' => …])
```

**Doesn't register:** post types, taxonomies, REST routes — those are app-level decisions.

**Guards:**
- `_doing_it_wrong` if `MetaKey('_x', encrypt: true, showInRest: true)` — REST consumers would see ciphertext
- `_doing_it_wrong` if `MetaKey('_x', showInRest: true)` without `authCapability` — silent 403 on REST writes

---

## Skill: Bridge with better-route

**When:** The user has a `better-route` `Router` and wants DTOs to drive endpoints.

**Pattern:**
```php
use BetterData\Route\BetterRouteBridge;
use BetterRoute\BetterRoute;

add_action('rest_api_init', function (): void {
    $router = BetterRoute::router('shop', 'v1');

    BetterRouteBridge::post(
        $router,
        '/products',
        ProductDto::class,
        fn (ProductDto $dto) => $dto->saveAsPost(),
        [
            'operationId' => 'productsCreate',
            'tags' => ['Products'],
            'envelope' => true,
            'permissionCallback' => fn () => current_user_can('edit_posts'),
        ],
    );

    BetterRouteBridge::patch(
        $router,
        '/products/{id}',
        ProductDto::class,
        fn (ProductDto $dto) => $dto->saveAsPost(only: ['price'], skipNullDeletes: true),
        ['source' => 'json', 'routeFields' => ['id']],
    );

    $router->register();
});
```

**The bridge:**
- Hydrates and validates the DTO from query / JSON / body / URL params
- Enforces `routeFields` no-collision (URL-owned fields rejected in body/query)
- Feeds `MetaKeyRegistry::toRestArgs()` into `RouteBuilder::args()`
- Feeds `requestSchema`, `responseSchema`, tags, scopes into `RouteBuilder::meta()`
- Presents returned `DataObject` values through `Presenter` with `PresentationContext::rest()`
- Translates exceptions to better-route HTTP errors (`ValidationException → 400 validation_failed`, etc.)

**Options keys:** `source`, `routeFields`, `validate`, `envelope`, `args` (use `false` to skip), `meta`, `permissionCallback`, `middlewares`, `operationId`, `tags`, `scopes`, `requestSchema`, `responseSchema`, `requestSchemaName`, `responseSchemaName`, `security`, `openapi`.

**OpenAPI components for both libs:**
```php
$components = BetterRouteBridge::openApiComponents([
    'Product' => ProductDto::class,
    'CreateProduct' => CreateProductDto::class,
]);

$openapi = BetterRoute::openApiExporter()->export(
    $router->contracts(true),
    ['components' => $components],
);
```

---

## Skill: Understand the exception contract

**Hydration phase:**
- `TypeCoercionException` — value can't be coerced to declared type
- `MissingRequiredFieldException` — required field absent

**Validation phase:**
- `ValidationException` — `errors()` returns the same `['fieldPath' => list<string>]` shape as `ValidationResult`

**Sink phase:**
- `MissingIdentifierException` — update without ID
- `UnknownFieldException` — typo in `only` with `strict: true`

**Source phase:**
- `PostNotFoundException` / `UserNotFoundException` / `TermNotFoundException` — single `hydrate()` calls only

**Request guards:**
- `NonceVerificationFailedException`, `CapabilityCheckFailedException`, `RequestParamCollisionException`

**Encryption:**
- `MissingEncryptionKeyException` — key undefined or invalid
- `DecryptionFailedException` — tampered ciphertext / missing rotation key (no oracle leak)

**Secret:**
- `SecretSerializationException` — `serialize()` / `unserialize()` of a Secret throws (silent loss is worse than failure)
