---
title: Quick Start
---

A working DTO with WP-aware hydration, validation, and presentation in five minutes.

## 1. Declare a DTO

```php
use BetterData\Attribute\Encrypted;
use BetterData\Attribute\MetaKey;
use BetterData\Attribute\PostField;
use BetterData\Attribute\Sensitive;
use BetterData\DataObject;
use BetterData\Secret;
use BetterData\Sink\HasWpSinks;
use BetterData\Source\HasWpSources;
use BetterData\Validation\Rule;

final readonly class ProductDto extends DataObject
{
    use HasWpSources;
    use HasWpSinks;

    public function __construct(
        public int $id = 0,
        #[Rule\Required, Rule\MinLength(2)]
        public string $post_title = '',
        public string $post_status = 'publish',
        public string $post_type = 'product',
        #[PostField('post_date_gmt')]
        public ?\DateTimeImmutable $publishedAt = null,

        #[MetaKey('_price', type: 'number', showInRest: true)]
        #[Rule\Min(0)]
        public float $price = 0.0,

        #[MetaKey('_sku', showInRest: true)]
        #[Rule\Required, Rule\Regex('/^[A-Z]{2,4}-\d+$/')]
        public string $sku = '',

        #[MetaKey('_vendor_api_key'), Encrypted]
        public ?Secret $vendorApiKey = null,

        #[MetaKey('_internal_note'), Sensitive]
        public ?string $internalNote = null,
    ) {}
}
```

Three rules to remember:

- `final readonly class` extending `DataObject` — immutability is load-bearing for `Secret`, `with()`, and sink projections.
- Every trailing constructor parameter has a default. PHP demotes earlier defaults to "required" if a later parameter has none, and you'll get `MissingRequiredFieldException` at hydration.
- Attributes are optional unless you need them — bare DTOs with matching property names hydrate from posts/users without `#[PostField]` etc.

## 2. Read

```php
// Hydrate from a post id
$product = ProductDto::fromPost(42);

$product->price;                  // 19.99 (coerced from WP's string meta)
$product->vendorApiKey->reveal(); // 'sk_live_abc…' (decrypted on read)

// Bulk-hydrate efficiently — 2 SQL queries for any number of posts
$products = ProductDto::fromPosts([1, 2, 3, 4, 5]);
```

## 3. Write

```php
// Immutable update
$updated = $product->with(['price' => 24.99]);

// Persist back: insert if id=0, update otherwise
$updated->saveAsPost();

// Partial update (only listed fields, ignore everything else)
$updated->saveAsPost(only: ['price', 'sku']);
```

## 4. Validate

```php
$result = $product->validate();
if (!$result->isValid()) {
    foreach ($result->flatten() as $error) {
        error_log($error);
    }
}

// Or fail-fast during hydration:
$product = ProductDto::fromArrayValidated($_POST);
```

## 5. Present

```php
use BetterData\Presenter\PresentationContext;
use BetterData\Presenter\Presenter;

// REST JSON — Secret and #[Sensitive] fields auto-excluded
$json = Presenter::for($product)
    ->context(PresentationContext::rest())
    ->only(['id', 'post_title', 'price', 'sku', 'priceFormatted'])
    ->compute('priceFormatted', fn ($p) => wc_price($p->price))
    ->rename('post_title', 'title')
    ->toJson();
```

## 6. Hook into WP REST

```php
use BetterData\Registration\MetaKeyRegistry;

add_action('init', function (): void {
    register_post_type('product', [...]);
    MetaKeyRegistry::register(
        ProductDto::class,
        objectType: 'post',
        subtype: 'product',
    );
});

add_action('rest_api_init', function (): void {
    register_rest_route('shop/v1', '/products', [
        'methods'  => 'POST',
        'args'     => MetaKeyRegistry::toRestArgs(ProductDto::class),
        'callback' => fn (\WP_REST_Request $r) =>
            \BetterData\Source\RequestSource::from($r)
                ->requireNonce('shop_save')
                ->requireCapability('edit_posts')
                ->bodyOnly()
                ->into(ProductDto::class)
                ->saveAsPost(),
    ]);
});
```

## 7. Compose with better-route

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
        ['operationId' => 'productsCreate', 'tags' => ['Products']],
    );

    $router->register();
});
```

The bridge hydrates and validates the DTO from the request, runs your handler, presents the returned `DataObject` through `PresentationContext::rest()`, and emits `MetaKeyRegistry`-derived OpenAPI metadata. See [Composition → BetterRouteBridge](../../composition/better-route-bridge) for the full options surface.

## Validation checklist

- DTO instances hydrate without throwing `TypeCoercionException`
- `validate()` returns `isValid() === true` for known-good payloads
- `Presenter::for($dto)->toArray()` redacts `Secret` to `'***'` and excludes `#[Sensitive]` fields by default
- `MetaKeyRegistry::register()` is called inside `init` — not at file load time
