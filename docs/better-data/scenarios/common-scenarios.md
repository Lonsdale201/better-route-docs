---
title: Common Scenarios
---

End-to-end recipes that combine multiple primitives. Each scenario references the topic pages where the underlying mechanics live.

## 1. CPT with DTO-driven REST args

**Goal:** Register a `product` CPT, drive `register_meta()` and `register_rest_route(['args'])` from the DTO, and persist via `PostSink`.

```php
use BetterData\Attribute\MetaKey;
use BetterData\Attribute\PostField;
use BetterData\DataObject;
use BetterData\Registration\MetaKeyRegistry;
use BetterData\Sink\HasWpSinks;
use BetterData\Source\HasWpSources;
use BetterData\Source\RequestSource;
use BetterData\Validation\Rule;

final readonly class ProductDto extends DataObject {
    use HasWpSources;
    use HasWpSinks;

    public function __construct(
        public int $id = 0,
        #[Rule\Required, Rule\MinLength(2), Rule\MaxLength(200)]
        public string $post_title = '',
        public string $post_status = 'publish',
        public string $post_type = 'product',

        #[MetaKey('_price', type: 'number', showInRest: true), Rule\Min(0)]
        public float $price = 0.0,

        #[MetaKey('_sku', showInRest: true), Rule\Required, Rule\Regex('/^[A-Z]{2,4}-\d+$/')]
        public string $sku = '',
    ) {}
}

add_action('init', function (): void {
    register_post_type('product', ['public' => true, 'show_in_rest' => true]);
    MetaKeyRegistry::register(ProductDto::class, 'post', 'product');
});

add_action('rest_api_init', function (): void {
    register_rest_route('shop/v1', '/products', [
        'methods'  => 'POST',
        'args'     => MetaKeyRegistry::toRestArgs(ProductDto::class),
        'callback' => fn (\WP_REST_Request $r) =>
            RequestSource::from($r)
                ->requireCapability('edit_posts')
                ->bodyOnly()
                ->into(ProductDto::class)
                ->saveAsPost(),
    ]);
});
```

References: [MetaKeyRegistry](../registration/meta-key-registry), [PostSink](../sinks/post-sink), [RequestSource](../sources/request-source).

## 2. Encrypted secret with leak-proof handling

**Goal:** Store an API key encrypted at rest; never leak it via `var_dump` / `json_encode`; reveal explicitly when calling the upstream.

```php
use BetterData\Attribute\Encrypted;
use BetterData\Attribute\MetaKey;
use BetterData\Secret;

final readonly class ApiConfigDto extends DataObject {
    public function __construct(
        public int $id = 0,

        #[MetaKey('_api_key'), Encrypted]
        public ?Secret $apiKey = null,
    ) {}
}

// Define BETTER_DATA_ENCRYPTION_KEY in wp-config.php first.
// php -r "echo base64_encode(random_bytes(32)).PHP_EOL;"

// Save (string coerces to Secret; #[Encrypted] envelopes it on write)
$config = ApiConfigDto::fromArray(['id' => 0, 'apiKey' => 'sk_live_abc']);
$config->saveAsPost();

// Read (envelope decrypts; Secret wraps the plaintext)
$config = ApiConfigDto::fromPost($id);
$config->apiKey;          // Secret instance
(string) $config->apiKey; // '***'
$config->apiKey->reveal(); // 'sk_live_abc'

// Use in an outbound call (auditable reveal site)
$key = $config->apiKey?->reveal();
wp_remote_post('https://api.example.com/charge', [
    'headers' => ['Authorization' => "Bearer {$key}"],
]);
```

References: [Secret](../security/secret), [Encryption](../security/encryption).

## 3. Bulk read with cache prewarming

**Goal:** Read 100 products with two SQL queries instead of 101.

```php
$ids = wp_list_pluck($order->get_items(), 'product_id');
$products = ProductDto::fromPosts($ids);
// Two queries: _prime_post_caches() + update_meta_cache('post', $ids)

foreach ($products as $product) {
    // process each typed DTO
}
```

References: [PostSource](../sources/post-source), [Sources Overview](../sources/overview#bulk-hydration-with-cache-prewarming).

## 4. Partial update with `only` + PATCH semantics

**Goal:** Update price without overwriting (or deleting) other meta keys when the JSON body omits them.

```php
$existing = ProductDto::fromPost($id);

// Variation A — explicit only (recommended for known partial flows)
$existing->with(['price' => 24.99])->saveAsPost(only: ['price']);

// Variation B — PATCH semantics (null in DTO leaves storage untouched)
$dto = ProductDto::fromArray($_POST); // missing fields are null
$dto->saveAsPost(skipNullDeletes: true);

// Variation C — both for stricter PATCH
$dto->saveAsPost(only: array_keys($_POST), skipNullDeletes: true);
```

References: [PostSink](../sinks/post-sink), [Sinks Overview](../sinks/overview#common-options).

## 5. Nested DTO via `#[ListOf]`

**Goal:** Model an order with line items as nested DataObjects.

```php
use BetterData\Attribute\ListOf;

final readonly class LineItemDto extends DataObject {
    public function __construct(
        public int $productId = 0,
        public int $quantity = 1,
        public float $unitPrice = 0.0,
    ) {}
}

final readonly class OrderDto extends DataObject {
    use HasWpSources, HasWpSinks;

    public function __construct(
        public int $id = 0,
        public string $orderNumber = '',

        #[MetaKey('_line_items'), ListOf(LineItemDto::class)]
        public array $items = [],
    ) {}
}

// Hydrate nested
$order = OrderDto::fromPost($postId);
$order->items[0]->productId; // typed access into nested DTO

// Serialize nested
$order->toArray();
// ['id' => 1, 'orderNumber' => '...', 'items' => [
//   ['productId' => 42, 'quantity' => 2, 'unitPrice' => 9.99],
//   ['productId' => 12, 'quantity' => 1, 'unitPrice' => 19.99],
// ]]

// Present nested
Presenter::for($order)->context(PresentationContext::rest())->toArray();
// Same shape, with PresentationContext applied recursively to each LineItemDto
```

References: [Type Coercion](../core/type-coercion#listof-arrays-of-dataobject), [Attributes](../core/attributes#listof).

## 6. Custom row table

**Goal:** Map a custom `wp_audit_events` table with `RowSource` / `RowSink`.

```php
use BetterData\Attribute\Column;
use BetterData\Attribute\DateFormat;

final readonly class AuditEventDto extends DataObject {
    use HasWpSinks;

    public function __construct(
        #[Column('id')]              public int $id = 0,
        #[Column('user_id')]         public int $userId = 0,
        #[Column('event_type')]      public string $eventType = '',
        #[Column('payload')]         public string $payload = '',
        #[DateFormat('Y-m-d H:i:s')]
        public ?\DateTimeImmutable $createdAt = null,
    ) {}
}

global $wpdb;
$table = "{$wpdb->prefix}audit_events";

// Insert
$event = new AuditEventDto(
    userId: get_current_user_id(),
    eventType: 'login',
    payload: json_encode(['ip' => $_SERVER['REMOTE_ADDR']]),
    createdAt: new \DateTimeImmutable('now'),
);
$event->saveAsRow($wpdb, $table);

// Bulk read with streaming
function fetchEvents(int $userId): \Generator {
    global $wpdb;
    $rows = $wpdb->get_results(
        $wpdb->prepare("SELECT * FROM {$wpdb->prefix}audit_events WHERE user_id = %d", $userId),
        ARRAY_A,
    );
    yield from $rows;
}

foreach (AuditEventDto::fromRows(fetchEvents(42)) as $event) {
    // typed DTO, low-memory iteration
}
```

References: [RowSource](../sources/row-source), [RowSink](../sinks/row-sink).

## 7. Context-aware presentation

**Goal:** Same DTO produces a different REST shape vs admin-list shape vs Hungarian-locale email body.

```php
use BetterData\Presenter\PresentationContext;
use BetterData\Presenter\Presenter;

$product = ProductDto::fromPost($id);

// REST — minimal, public-safe
$rest = Presenter::for($product)
    ->context(PresentationContext::rest())
    ->only(['id', 'post_title', 'price', 'sku'])
    ->rename('post_title', 'title')
    ->toJson();

// Admin list — show internal fields, hide cost from non-admins
$admin = Presenter::for($product)
    ->context(PresentationContext::admin())
    ->compute('priceFormatted', fn ($p) => wc_price($p->price))
    ->hideUnlessCan('cost', 'manage_woocommerce')
    ->toArray();

// Hungarian email body — locale flows into formatters
$email = Presenter::for($product)
    ->context(PresentationContext::email(userId: $customerId, locale: 'hu_HU'))
    ->compute('priceDisplay', fn ($p, $ctx) => wc_price($p->price))
    ->formatDate('publishedAt', 'Y. F j.', as: 'publishedHu')
    ->toArray();
```

References: [Presenter Overview](../presenter/overview), [PresentationContext](../presenter/presentation-context).

## 8. better-route bridge

**Goal:** Wire DTO hydration, validation, OpenAPI metadata, and Presenter response shaping into a single bridge call.

```php
use BetterData\Route\BetterRouteBridge;
use BetterRoute\BetterRoute;

add_action('rest_api_init', function (): void {
    $router = BetterRoute::router('shop', 'v1');

    BetterRouteBridge::post(
        $router,
        '/products',
        ProductDto::class,
        function (ProductDto $dto): ProductDto {
            $id = $dto->saveAsPost();
            return $dto->with(['id' => $id]);
        },
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
        function (ProductDto $dto): ProductDto {
            $dto->saveAsPost(only: ['price'], skipNullDeletes: true);
            return $dto;
        },
        [
            'source' => 'json',
            'routeFields' => ['id'],
            'operationId' => 'productsUpdate',
            'tags' => ['Products'],
            'envelope' => true,
        ],
    );

    $router->register();
});
```

References: [Composition → BetterRouteBridge](../../composition/better-route-bridge).
