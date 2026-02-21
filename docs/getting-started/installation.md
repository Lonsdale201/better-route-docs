---
title: Installation
---

## Runtime requirements

- PHP `^8.1`
- WordPress REST context (register routes in `rest_api_init`)

## Composer setup

`better-route` is currently documented at `v0.1.0` baseline, but package publishing is not live yet.

Use local/path repository setup during development:

```json
{
  "require": {
    "better-route/better-route": "*"
  },
  "repositories": [
    {
      "type": "path",
      "url": "../../../libraries/better-route",
      "options": { "symlink": true }
    }
  ]
}
```

After publishing, switch to a normal constraint, for example:

```json
{
  "require": {
    "better-route/better-route": "^1.0"
  }
}
```

## Local quality commands

```bash
composer test
composer analyse
composer cs-check
```

## Validation checklist

- `composer show better-route/better-route` resolves correctly
- `composer test` passes
- routes are registered only inside `rest_api_init`
- no docs assumptions rely on unpublished package index features
