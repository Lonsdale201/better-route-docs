---
title: FAQ
---

## Is this a full WordPress plugin with admin UI?

No. It is a Composer library for API contract and middleware composition.

## Is WooCommerce supported with dedicated abstractions?

Not yet. You can still integrate Woo data via custom handlers/resources, but no dedicated Woo layer exists in `v0.1.0` baseline.

## Is package registry publishing available now?

Not yet. Current install flow is local/path repository; registry release can be added later.

## Does middleware auth replace `permission_callback`?

No. Permission callback is still explicit during route registration.

## Can I hide routes from OpenAPI export?

Yes. Set meta:

```php
->meta(['openapi' => ['include' => false]])
```

## Are unknown query params ignored?

No. Resource list parsers reject unknown params with `400 validation_failed`.
