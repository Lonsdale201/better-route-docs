---
title: better-data Documentation
sidebar_position: 1
---

`better-data` is a PHP 8.3+ DTO and Presenter library for WordPress. Typed, immutable DTOs hydrated from any WordPress shape; symmetric write sinks; contextual output rendering; attribute-driven validation; and explicit security primitives.

## Status

- Baseline documentation target: `v1.0.0`
- Latest release: [`v1.0.0`](release-notes/v1.0.0)
- Packagist/package index release: not published yet — install via VCS repository

## What you get

- **DataObject** — `final readonly class` DTOs declared via constructor promotion; hydrate from arrays, posts, users, terms, options, `$wpdb` rows, or REST requests
- **Sources** — `PostSource`, `UserSource`, `TermSource`, `OptionSource`, `RowSource`, `RequestSource`; bulk hydration with cache prewarming; request guards (nonce, capability, body/query/URL routing, no-collision)
- **Sinks** — `PostSink`, `UserSink`, `TermSink`, `OptionSink`, `RowSink`; projection-first API (`toArgs` / `toMeta` / `toArray`) for unit tests + convenience methods (`save`, `insert`, `update`) with `wp_slash()` baked in
- **Presenter** — context-aware output shaping for REST / admin / email / CSV; field whitelist, computed fields, locale-aware `formatDate` / `formatCurrency`, `Secret` and `#[Sensitive]` redaction
- **Validation** — attribute-driven rules (`Required`, `Email`, `Url`, `Uuid`, `Regex`, `Min`/`Max`, `MinLength`/`MaxLength`, `OneOf`); pluggable `ValidationEngineInterface`
- **Security primitives** — `Secret` leak-proof container; `#[Sensitive]` for PII redaction; `#[Encrypted]` AES-256-GCM at-rest with rotation
- **Registration** — `MetaKeyRegistry::register()` drives `register_meta()` from DTO shape; `toJsonSchema()` / `toRestArgs()` for REST endpoints
- **better-route bridge** — `BetterData\Route\BetterRouteBridge` wires DTOs into a `better-route` `Router` for hydration, validation, OpenAPI metadata, and Presenter response shaping

## Who this is for

- WordPress plugin and theme teams that want typed, contract-first data instead of hand-rolled `$_POST` parsing
- Teams already standing up REST APIs that want to drop their fragile array conversions
- Codebases with sensitive data (API keys, tokens, PII) that need explicit handling rather than `wp_options` plaintext

## What this is NOT

- Not an ORM. No relationships, no query builder, no migrations. Use `WP_Query` / `get_users` / `$wpdb` and hand the results to a source.
- Not a form renderer. Data shaping only — HTML is the consumer's problem.
- Not a DI container or service bus. Sibling library `better-route` handles routing.
- Not a secrets manager. `#[Encrypted]` provides at-rest AES-256-GCM; key distribution and rotation policy are the consumer's responsibility.

## Documentation map

1. `Getting Started` for install and a working DTO in five minutes
2. `Core` for `DataObject`, attributes, validation, type coercion
3. `Sources` for read paths (posts / users / terms / options / rows / REST requests)
4. `Sinks` for write paths
5. `Presenter` for context-aware output rendering
6. `Security` for `Secret`, `#[Sensitive]`, `#[Encrypted]`
7. `Registration` for WordPress meta key registration and JSON Schema export
8. `Reference` for API tables and FAQ
9. `AI Agent Skills` for structured skills an AI agent can use
10. `Release Notes` for what changed in each version

## Composition with better-route

`BetterRouteBridge` is the optional adapter:

```php
use BetterData\Route\BetterRouteBridge;

BetterRouteBridge::post(
    $router,
    '/products',
    ProductDto::class,
    fn (ProductDto $dto) => $dto->saveAsPost(),
    ['tags' => ['Products']],
);
```

See [Composition](../composition/overview) for the full pattern.
