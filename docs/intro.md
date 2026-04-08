---
title: better-route Documentation
sidebar_position: 1
---

`better-route` is a Composer-first WordPress REST contract layer for teams that need stable, versioned APIs.

## Status

- Baseline documentation target: `v0.2.0`
- Current code constant: `0.2.0` (`BetterRoute\Support\Version::VERSION`)
- Packagist/package index release: not published yet
- Dedicated WooCommerce abstraction layer: available since v0.2.0

## What you get

- Fluent router on top of `register_rest_route()`
- Middleware pipeline with deterministic order: `global -> group -> route`
- Resource DSL for CPT and custom table endpoints
- Strict query contract (`unknown params => 400`)
- Unified error envelope with `requestId`
- Built-in auth, write-safety, and observability middleware building blocks
- OpenAPI MVP exporter with security scheme support and optional `openapi.json` endpoint
- WooCommerce integration: Orders, Products, Customers, Coupons with full CRUD, query parsing, HPOS guard, and pre-built OpenAPI component schemas

## Who this is for

- WordPress teams building headless APIs
- Plugin/app teams that want contract-first endpoints
- Integrations where schema, error shape, and policy behavior must stay predictable
- WooCommerce stores that need a typed, middleware-aware REST layer over core WC data

## What this is not

- Not a UI plugin with admin pages
- Not a no-code endpoint builder
- Not a WooCommerce replacement — it exposes WC data through a stricter contract

## Documentation map

Start with:

1. `Getting Started` for install + first route/resource
2. `Core` for router, middleware lifecycle, error contract
3. `Resources` for CPT/table DSL and query safety
4. `Auth` for JWT, application passwords, cookie/nonce, bearer token
5. `WooCommerce` for orders, products, customers, coupons integration
6. `OpenAPI` for schema export, security schemes, and endpoint publishing
7. `Reference` for API tables and middleware catalog
8. `AI Agent Skills` for structured skills an AI agent can use to work with the library
