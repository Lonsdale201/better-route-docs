---
title: API Reference
---

Compact signature index for the public surface. For semantics, follow the links to topic pages.

## DataObject

```php
abstract readonly class BetterData\DataObject

static fromArray(array $data): static
static fromArrayValidated(array $data, ?ValidationEngineInterface $engine = null): static
toArray(): array
with(array $changes): static
validate(?ValidationEngineInterface $engine = null): ValidationResult
```

See [Core → DataObject](../core/data-object).

## Sources

```php
BetterData\Source\PostSource
    ::hydrate(int|WP_Post $post, string $dtoClass): DataObject
    ::hydrateMany(array $postIds, string $dtoClass): array

BetterData\Source\UserSource
    ::hydrate(int|WP_User $user, string $dtoClass): DataObject
    ::hydrateMany(array $userIds, string $dtoClass): array

BetterData\Source\TermSource
    ::hydrate(int|WP_Term $term, string $dtoClass): DataObject
    ::hydrateMany(array $termIds, string $dtoClass): array

BetterData\Source\OptionSource
    ::hydrate(string $option, string $dtoClass, array $default = []): DataObject

BetterData\Source\RowSource
    ::hydrate(array|object $row, string $dtoClass): DataObject
    ::hydrateMany(iterable $rows, string $dtoClass): array

BetterData\Source\RequestSource
    ::from(WP_REST_Request $request): self
    ->requireNonce(string $action, string $paramName = '_wpnonce'): self
    ->requireCapability(string $capability, mixed ...$args): self
    ->bodyOnly(): self
    ->jsonOnly(): self
    ->queryOnly(): self
    ->urlOnly(): self
    ->noCollision(array $routeOwnedFields): self
    ->into(string $dtoClass): DataObject
```

`use BetterData\Source\HasWpSources;` adds `::fromPost`, `::fromPosts`, `::fromUser`, `::fromUsers`, `::fromTerm`, `::fromTerms`, `::fromOption`, `::fromRow`, `::fromRows`, `::fromRequest` to a DTO.

## Sinks

```php
BetterData\Sink\PostSink
    ::toArgs(DataObject $dto, ?array $only = null): array
    ::toMeta(DataObject $dto, ?array $only = null): array
    ::insert(DataObject $dto, ?array $only = null, bool $strict = false, bool $skipNullDeletes = false): int
    ::update(DataObject $dto, ?int $postId = null, ?array $only = null, bool $strict = false, bool $skipNullDeletes = false): int
    ::save(DataObject $dto, ?array $only = null, bool $strict = false, bool $skipNullDeletes = false): int

BetterData\Sink\UserSink   // mirrors PostSink; excludes user_pass, user_activation_key
BetterData\Sink\TermSink   // structured toArgs (term_id, name, taxonomy, args, meta); excludes term_taxonomy_id, count

BetterData\Sink\OptionSink
    ::toArray(DataObject $dto, ?array $only = null, bool $strict = false): array
    ::save(DataObject $dto, string $option, ?array $only = null, ?bool $autoload = null, bool $strict = false): bool

BetterData\Sink\RowSink
    ::toArray(DataObject $dto, ?array $only = null): array
    ::insert(\wpdb $wpdb, string $table, DataObject $dto, ?array $only = null, ?array $formats = null): int
    ::update(\wpdb $wpdb, string $table, DataObject $dto, array $where, ?array $only = null, ?array $formats = null, ?array $whereFormats = null): int
```

`use BetterData\Sink\HasWpSinks;` adds `->saveAsPost`, `->toPostArgs`, `->saveAsUser`, `->toUserArgs`, `->saveAsTerm`, `->saveAsOption`, `->toOptionArray`, `->saveAsRow`, `->toRowArray` to a DTO instance.

## Presenter

```php
BetterData\Presenter\Presenter
    ::for(DataObject $dto): self
    ::forCollection(iterable $dtos): CollectionPresenter
    ->context(PresentationContext $context): self
    ->only(array $fields, bool $strict = false): self
    ->hide(string|array $field, ?callable $when = null): self
    ->hideUnlessCan(string $field, string $capability, ...$args): self
    ->showOnlyFor(string $field, array $roles): self
    ->rename(string|array $from, ?string $to = null): self
    ->compute(string $name, Closure $factory): self
    ->preset(string $field, Closure $renderer): self
    ->includeSensitive(array $fields): self
    ->formatDate(string $field, string $format, ?string $as = null): self
    ->formatCurrency(string $field, ?string $as = null, ?string $currency = null, bool $html = false): self
    ->toArray(): array
    ->toJson(?int $flags = null): string
```

`CollectionPresenter` exposes the same fluent methods; terminals return `list<array>` and a JSON-encoded list.

```php
BetterData\Presenter\PresentationContext
    new (string $name, ?int $userId = null, ?string $locale = null, ?string $timezone = null, array $meta = [])
    ::rest(?int $userId = null): self
    ::admin(?int $userId = null): self
    ::email(?int $userId = null, ?string $locale = null): self
    ::none(): self
    ->withName(string $name): self
    ->withUserId(?int $userId): self
    ->withLocale(?string $locale): self
    ->withTimezone(?string $timezone): self
    ->withMeta(array $meta): self
    ->userCan(string $capability, ...$args): bool
    ->userRoles(): list<string>
```

## Validation

```php
BetterData\Validation\ValidationResult
    public array $errors
    ->isValid(): bool
    ->hasErrors(): bool
    ->errorsFor(string $fieldPath): array
    ->firstError(string $fieldPath): ?string
    ->flatten(): array
    ->throwIfInvalid(): void

BetterData\Validation\ValidationEngineInterface
    ->validate(DataObject $subject): ValidationResult
```

Built-in rules (under `BetterData\Validation\Rule\`):

```
#[Required], #[Email], #[Url], #[Uuid]
#[Regex($pattern, ?$message)]
#[Min($n)], #[Max($n)]
#[MinLength($n)], #[MaxLength($n)]
#[OneOf($allowed)]
new Callback(Closure)   // programmatic only, not an attribute
```

## Security primitives

```php
BetterData\Secret
    new (string $value)
    ->reveal(): string
    ->equals(Secret|string $other): bool
    // blocks: __toString, json_encode, var_dump, print_r, serialize (throws), unserialize (throws)

BetterData\Encryption\EncryptionEngine
    ::generateKey(): string                // base64 of 32 random bytes
    ::encrypt(string $plaintext): string   // returns 'bd:v1:...' envelope
    ::decrypt(string $envelope): string    // throws on tampered/missing key/version mismatch
```

## Registration

```php
BetterData\Registration\MetaKeyRegistry
    ::register(string $dtoClass, string $objectType = 'post', string $subtype = ''): list<string>
    ::toJsonSchema(string $dtoClass): array
    ::toRestArgs(string $dtoClass): array
```

## better-route bridge

```php
BetterData\Route\BetterRouteBridge
    ::get(object $router, string $uri, string $dtoClass, callable $handler, array $options = []): mixed
    ::post(object $router, string $uri, string $dtoClass, callable $handler, array $options = []): mixed
    ::put(object $router, string $uri, string $dtoClass, callable $handler, array $options = []): mixed
    ::patch(object $router, string $uri, string $dtoClass, callable $handler, array $options = []): mixed
    ::delete(object $router, string $uri, string $dtoClass, callable $handler, array $options = []): mixed
    ::handler(string $dtoClass, callable $handler, array $options = []): \Closure
    ::hydrate(mixed $request, string $dtoClass, array $options = []): DataObject
    ::args(string $dtoClass, array $options = []): array
    ::meta(string $dtoClass, array $options = []): array
    ::openApiComponents(array $dtoClasses): array
    ::schemaRef(string $dtoClass, ?string $schemaName = null): string
    ::schemaName(string $dtoClass): string
    ::parameters(string $dtoClass, array $options = []): array
```

See [Composition → BetterRouteBridge](../../composition/better-route-bridge) for the options array.

## Attributes (constructor signatures)

```php
new BetterData\Attribute\MetaKey(
    string $key,
    ?string $type = null,
    bool $showInRest = false,
    bool $single = true,
    mixed $default = null,
    ?string $description = null,
    ?string $sanitize = null,
    ?string $authCapability = null,
    bool $encrypt = false,
)

new BetterData\Attribute\PostField(string $name)
new BetterData\Attribute\UserField(string $name)
new BetterData\Attribute\TermField(string $name)
new BetterData\Attribute\Column(string $name)
new BetterData\Attribute\Encrypted()
new BetterData\Attribute\Sensitive()
new BetterData\Attribute\ListOf(string $class)
new BetterData\Attribute\DateFormat(string $format)
```

See [Reference → Attributes](attributes) for the interaction matrix.
