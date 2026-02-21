---
title: OpenAPI Overview
---

OpenAPI support is metadata-driven MVP in `v0.1.0` baseline.

## What is available

- contract aggregation from Router/Resource
- OpenAPI 3.1.0 document export
- optional runtime endpoint: `/openapi.json`

## Metadata fields used

- `operationId`
- `tags`
- `scopes`
- `parameters`
- `requestSchema`
- `responseSchema`
- `openapi.include`

`openapi.include=false` routes are excluded by default.

## What is not available yet

- full automatic schema inference from arbitrary PHP runtime types
- advanced polymorphism/discriminator generation
- dedicated WooCommerce domain schema presets

## Validation checklist

- every documented endpoint has stable `operationId`
- schemas referenced by `$ref` exist in components
- intentionally internal routes set `openapi.include=false`
