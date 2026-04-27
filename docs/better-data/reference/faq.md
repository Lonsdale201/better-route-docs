---
title: FAQ
---

## Is this an ORM?

No. There's no relationship layer, no query builder, no migrations, no lazy loading. `better-data` shapes data — it doesn't query it. Use `WP_Query`, `get_users`, `$wpdb` for queries, then hand the results to a source. The library's job starts when you have a row/post/user and ends when you write one.

## Can I use it without WordPress?

The internal engines (`AttributeDrivenHydrator`, `TypeCoercer`, `SinkProjection`, `RestSchemaBuilder`) are WP-free — you can hydrate DTOs from any data source in unit tests. The sources and sinks are WP-aware (they call WP functions), but the DataObject base class itself doesn't need WordPress to construct.

## Why no auto-sanitization?

`MetaKey($sanitize: 'sanitize_text_field')` accepts a callback name explicitly because sanitization is app-specific. Silently installing one would override consumer pipelines and surprise teams that rely on raw values. The library's `TypeCoercer` produces typed PHP values; sanitization for storage is the consumer's call.

## Can I skip `MetaKeyRegistry::register()`?

Yes. The registry is opt-in. If you don't use `register_meta()`-driven REST or admin features, just hydrate and persist via sources/sinks; meta keys don't need to be registered for `update_post_meta()` to work.

The registry is required when:

- You expose meta keys via WP's REST API (`show_in_rest: true`)
- You want a JSON Schema export for OpenAPI components
- You want `MetaKeyRegistry::toRestArgs()` to drive `register_rest_route(['args' => ...])`

## Why can't I store a `Secret` via PHP `serialize()`?

`Secret` throws `SecretSerializationException` from `__serialize()`. The reasoning: a serialized credential that silently redacts to `'***'` is the worst outcome — you lose the value and don't notice. Throwing forces the caller to make an explicit choice. For cross-request persistence, use `#[Encrypted]` to store the value as a meta key or option.

## What's the difference between `#[Sensitive]` and `Secret`?

| | `#[Sensitive]` | `Secret` |
|---|---|---|
| Layer | Presentation only | Type system |
| Storage | Plain text | Plain text (encrypt with `#[Encrypted]`) |
| In-memory | Plain string | Wrapped, leak-proof |
| `toArray()` | Plain text | `'***'` |
| Presenter default | Excluded | Excluded **and** redacted |

Use `#[Sensitive]` for PII (don't want to flow into REST output, fine to dump in error logs). Use `Secret` for credentials (don't want to leak through any serialization path).

## How do I handle file uploads?

`better-data` doesn't ship a file-upload source. Use `WP_REST_Request::get_file_params()` directly, run the upload through `wp_handle_upload()`, then hand the resulting attachment ID to a DTO field. The library models the metadata, not the file storage.

## Why constructor promotion only?

Constructor promotion gives the engine a single, reflectable list of properties with types, defaults, and attributes. Properties declared outside the constructor have no parameter metadata to inspect, breaking auto-detection and required-field tracking.

The downside: every property is `public`. That's intentional — DataObjects are values, not encapsulated services. If you need encapsulation, model that layer separately with a service that holds DTOs.

## Why `final readonly`?

- `readonly` makes immutability load-bearing, which `Secret`, `with()`, and the projection-first sink API rely on. Without immutability, sink projections couldn't be safely cached or replayed.
- `final` prevents subclassing. DataObject subclasses are values; extending a value class is usually a smell. If you need shared logic across DTOs, extract a trait or a service, not a base class.

## Can I use a custom validation engine?

Yes. Implement `BetterData\Validation\ValidationEngineInterface` and pass the engine to `validate()` / `fromArrayValidated()`. The default `BuiltInValidator` reads `Rule\*` attributes; a custom engine can ignore those entirely and use whatever metadata source it prefers (Symfony Validator, Respect, Laravel).

## How does `with()` handle `Secret`?

`with()` snapshots the current property values and merges the changes, then re-runs the constructor. The snapshot bypasses `toArray()`, so `Secret` instances stay as `Secret` instances (not redacted strings) — this is critical, otherwise `with()` would silently destroy credentials.

## Does the library work with WC Subscriptions / EDD / CPT UI / etc.?

Yes. `better-data` doesn't know about plugins; it only cares about WP-shaped data. Any plugin's CPT meta keys can be modeled with `#[MetaKey]`. Any plugin's user meta can be hydrated via `UserSource`. The library is plugin-agnostic.

## What about HPOS?

For `WP_Post`-based reads/writes, `PostSource` and `PostSink` go through `wp_*_post()` and `update_post_meta()`, which HPOS plugins typically intercept. For HPOS-native order tables, model them through `RowSource` / `RowSink` against the HPOS tables directly.

## Can I integrate with Symfony / Laravel?

The library is framework-free under the hood — sources and sinks are the only WP-coupled layer. The `DataObject`, `TypeCoercer`, `Presenter`, and `Validation` layers are pure PHP. Plumb them into any framework's controller / serializer pipeline.

## Why is `BetterRouteBridge` opt-in?

`better-data` doesn't take `better-route` as a hard Composer dependency. The bridge operates on duck-typed `$router` objects (calls `get`/`post`/`put`/`patch`/`delete` by name) and only fires when both libraries are installed. Apps that use `better-data` with their own routing layer don't pay any cost for the bridge.

## How do I test DTOs without WordPress?

Hydrate via `DataObject::fromArray($data)` directly. The base class doesn't call WP functions. For source/sink behavior, wrap WP function calls in your own thin abstractions and use the projection methods (`toArgs`, `toMeta`, `toArray`) which return plain arrays without touching WP.

## Where do I find tests?

`tests/Unit/` in the repository. Notable tests: `AttributeDrivenHydratorTest`, `TypeCoercionTest`, `SinkProjectionTest`, `PresenterTest`, `EncryptedAttributeTest`, `ListOfTest`, `BetterRouteBridgeTest`. Fixtures live under `tests/Fixtures/`.
