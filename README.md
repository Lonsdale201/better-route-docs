# better-docs

Official documentation site for the `better-route` and `better-data` WordPress PHP libraries.

[![better-route library](https://img.shields.io/badge/Library-better--route-0d5bd7?style=for-the-badge)](https://github.com/Lonsdale201/better-route)
[![better-data library](https://img.shields.io/badge/Library-better--data-7c3aed?style=for-the-badge)](https://github.com/Lonsdale201/better-data)
[![Open documentation](https://img.shields.io/badge/Open-Documentation-1f9d55?style=for-the-badge)](https://lonsdale201.github.io/better-docs/)

## What is this?

This repository contains the public documentation website only:

- **better-route** — REST routing, middleware, Resource DSL, WooCommerce integration, OpenAPI export
- **better-data** — typed DTOs, sources / sinks, Presenter, security primitives (Secret, #[Encrypted]), MetaKeyRegistry
- **Composition** — `BetterRouteBridge` for DTO-driven REST endpoints with auto-generated OpenAPI schemas

This is not a library source repository.

## Library sources

- https://github.com/Lonsdale201/better-route
- https://github.com/Lonsdale201/better-data

## Live documentation

- https://lonsdale201.github.io/better-docs/

## Local development

```bash
npm install
npm start          # dev server with hot reload
npm run build      # production build into ./build
```

The site is built with [Docusaurus 3](https://docusaurus.io/) and auto-deployed to GitHub Pages on every push to `main` via `.github/workflows/deploy-pages.yml`.
