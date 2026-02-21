---
title: better-route Documentation
sidebar_position: 1
---

`better-route` is a Composer-first WordPress REST contract layer for teams that need stable, versioned APIs.

## Status

- Baseline documentation target: `v0.1.0`
- Current code constant: `0.1.0-dev` (`BetterRoute\Support\Version::VERSION`)
- Packagist/package index release: not published yet
- Dedicated WooCommerce abstraction layer: not available yet

## What you get

- Fluent router on top of `register_rest_route()`
- Middleware pipeline with deterministic order: `global -> group -> route`
- Resource DSL for CPT and custom table endpoints
- Strict query contract (`unknown params => 400`)
- Unified error envelope with `requestId`
- Built-in auth, write-safety, and observability middleware building blocks
- OpenAPI MVP exporter and optional `openapi.json` endpoint

## Who this is for

- WordPress teams building headless APIs
- Plugin/app teams that want contract-first endpoints
- Integrations where schema, error shape, and policy behavior must stay predictable

## What this is not

- Not a UI plugin with admin pages
- Not a no-code endpoint builder
- Not Woo-specific routing abstraction (yet)

## Documentation map

Start with:

1. `Getting Started` for install + first route/resource
2. `Core` for router, middleware lifecycle, error contract
3. `Resources` for CPT/table DSL and query safety
4. `OpenAPI` for schema export and endpoint publishing
5. `Reference` for API tables and middleware catalog
