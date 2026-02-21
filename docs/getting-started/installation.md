---
title: Installation
---

## Runtime requirements

- PHP `^8.1`
- WordPress REST context (register routes in `rest_api_init`)

## Composer setup

Use VCS repository setup from the public GitHub repository:

```json
{
  "require": {
    "better-route/better-route": "^0.1.1"
  },
  "repositories": [
    {
      "type": "vcs",
      "url": "https://github.com/Lonsdale201/better-route"
    }
  ],
  "prefer-stable": true
}
```

After package index publication, you can remove the `repositories` block and keep only `require`.

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
