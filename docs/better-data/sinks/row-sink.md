---
title: RowSink
---

`BetterData\Sink\RowSink` writes a DataObject to a custom database table via `$wpdb`.

## Methods

```php
RowSink::toArray(DataObject $dto, ?array $only = null): array
RowSink::insert(\wpdb $wpdb, string $table, DataObject $dto, ?array $only = null, ?array $formats = null): int
RowSink::update(\wpdb $wpdb, string $table, DataObject $dto, array $where, ?array $only = null, ?array $formats = null, ?array $whereFormats = null): int
```

`insert()` returns the affected row count (typically `1` on success). `update()` returns the affected row count too.

Both throw `RuntimeException` if `$wpdb->last_error` is non-empty after the call.

## Projection: `toArray()`

Returns a column-keyed array ready for `$wpdb->insert/update`:

- Applies `#[Column]` aliases (property → column)
- Applies `#[DateFormat]` overrides; default for row columns is MySQL `'Y-m-d H:i:s'`
- Unwraps `BackedEnum` to `.value`
- Converts `DateTimeInterface` to UTC before formatting
- Recurses into arrays of `DataObject` (calls `toArray()` on each)

```php
final readonly class OrderRowDto extends DataObject {
    use HasWpSinks;

    public function __construct(
        #[Column('id')]              public int $id = 0,
        #[Column('order_id')]        public int $orderId = 0,
        #[Column('product_id')]      public int $productId = 0,
        #[Column('quantity')]        public int $quantity = 0,
        public string $status = 'pending',
        public ?\DateTimeImmutable $createdAt = null,
    ) {}
}

$dto = OrderRowDto::fromArray([
    'orderId' => 1,
    'productId' => 42,
    'quantity' => 3,
    'createdAt' => new \DateTimeImmutable('now'),
]);

RowSink::toArray($dto);
/*
[
    'id'         => 0,
    'order_id'   => 1,
    'product_id' => 42,
    'quantity'   => 3,
    'status'     => 'pending',
    'created_at' => '2024-03-15 09:30:00', // ← UTC-converted MySQL format
]
*/
```

## Insert and update

```php
global $wpdb;
$table = "{$wpdb->prefix}order_items";

// Insert
$dto = OrderRowDto::fromArray([...]);
RowSink::insert($wpdb, $table, $dto);

// Or via the trait shortcut:
$dto->saveAsRow($wpdb, $table);

// Update
$existing = OrderRowDto::fromArray([...]);
RowSink::update(
    $wpdb,
    $table,
    $existing->with(['status' => 'shipped']),
    where: ['id' => $existing->id],
    only: ['status'],
);

// Or via trait — when the DTO has a positive id, saveAsRow updates
$existing->with(['status' => 'shipped'])
    ->saveAsRow($wpdb, $table, where: ['id' => $existing->id], only: ['status']);
```

## Format specifiers

`$wpdb->insert/update` accepts an optional formats array (`['%d', '%s', ...]`) that maps to columns. Pass it through:

```php
RowSink::insert($wpdb, $table, $dto, formats: ['%d', '%d', '%d', '%d', '%s', '%s']);
```

Without formats, `$wpdb` infers types — usually fine, but explicit formats prevent edge cases on numeric strings.

## Slashing

`$wpdb` does not call `wp_unslash()` internally, so `RowSink` does **not** apply `wp_slash()` either. Values are passed raw. If your data needs explicit escaping beyond what `$wpdb->prepare()` already does, handle it before calling the sink.

## No system/meta split

Unlike post/user/term sinks, `RowSink` writes a flat row. There's no `meta_input` equivalent — every property maps to a column.

## Common mistakes

- Passing a positive `id` and expecting `insert()` to skip it — `insert()` always inserts; it's the caller's responsibility to choose `insert()` vs `update()`
- Forgetting `where:` on update — `update()` requires `$where`; without it `wpdb->update` would update every row
- Mixing UTC and site-local datetimes in the same column — `RowSink` converts all `DateTimeInterface` to UTC; if you need site-local persistence, format the value yourself before passing it (or use `compute` step in a `with()` call)
