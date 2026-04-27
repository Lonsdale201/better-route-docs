---
title: RowSource
---

`BetterData\Source\RowSource` hydrates a DataObject from a raw `$wpdb` row (associative array or `stdClass`).

## Methods

```php
RowSource::hydrate(array|object $row, string $dtoClass): DataObject
RowSource::hydrateMany(iterable $rows, string $dtoClass): array
```

`hydrateMany()` accepts any iterable — including generators — so you can stream large result sets without loading everything into memory.

## #[Column] aliases

Use `#[Column]` to map between database column names and PHP property names:

```php
final readonly class OrderRowDto extends DataObject {
    use HasWpSources;

    public function __construct(
        #[Column('id')]              public int $id = 0,
        #[Column('order_id')]        public int $orderId = 0,
        #[Column('product_id')]      public int $productId = 0,
        #[Column('quantity')]        public int $quantity = 0,

        // No #[Column] needed when names match
        public string $status = '',

        #[DateFormat('Y-m-d H:i:s')]
        public ?\DateTimeImmutable $createdAt = null,
    ) {}
}
```

`#[Column]` is optional when the column name matches the property name.

## WPDB type quirks

`$wpdb` returns every column value as a string, even integers and decimals. `TypeCoercer` handles the conversion based on the DTO's declared types.

## Example

```php
$row = $wpdb->get_row(
    $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}orders WHERE id = %d",
        $orderId,
    ),
    ARRAY_A,
);

if ($row === null) {
    throw new RuntimeException('Order not found');
}

$order = OrderRowDto::fromRow($row);
```

For bulk reads:

```php
$rows = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}orders LIMIT 100", ARRAY_A);
$orders = OrderRowDto::fromRows($rows);
```

For streaming (when you can't fit the result set in memory):

```php
function fetchOrdersGenerator(int $batchSize = 500): Generator {
    global $wpdb;
    $offset = 0;
    while (true) {
        $batch = $wpdb->get_results(
            $wpdb->prepare("SELECT * FROM {$wpdb->prefix}orders LIMIT %d OFFSET %d", $batchSize, $offset),
            ARRAY_A,
        );
        if (!$batch) break;
        yield from $batch;
        $offset += $batchSize;
    }
}

foreach (OrderRowDto::fromRows(fetchOrdersGenerator()) as $order) {
    // process one DTO at a time, low memory footprint
}
```

## DateTime parsing

Stored MySQL datetimes (`'2024-03-15 09:30:00'`) coerce to `DateTimeImmutable` natively. Use `#[DateFormat]` if your column uses a non-standard format on write — read parsing is automatic via `DateTimeImmutable::__construct`.

If your custom table mixes UTC and local times, set the timezone explicitly inside a constructor `compute` step or a `#[DateFormat]` override; `RowSource` does not infer timezones the way `PostSource` does.

## Common mistakes

- Calling `RowSource::hydrate($row)` where `$row` is `false` or `null` — handle the missing-row case before passing to the source
- Expecting `#[Column]` to flow into the sink direction — column aliasing is symmetric (also used by [RowSink](../sinks/row-sink))
- Forgetting that `$wpdb` strings need numeric coercion — `TypeCoercer` does this; just declare the right PHP type
