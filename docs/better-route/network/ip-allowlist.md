---
title: IP Allowlist
---

`IpAllowlistMiddleware` *(v0.6.0)* denies requests whose resolved client IP is outside an explicit list of CIDR ranges. Pair it with [`TrustedProxyClientIpResolver`](trusted-proxy) so the matched IP is the real client, not the proxy.

Use it for back-channel webhooks, internal admin endpoints behind a VPN, partner integrations with known egress CIDRs, and anywhere "only these networks may reach this route" is the actual policy.

## Minimal example

```php
use BetterRoute\Middleware\Network\IpAllowlistMiddleware;
use BetterRoute\Middleware\Network\TrustedProxyClientIpResolver;

$resolver = new TrustedProxyClientIpResolver(
    trustedProxyCidrs: ['173.245.48.0/20', '103.21.244.0/22'],
    forwardedHeaders: ['CF-Connecting-IP', 'X-Forwarded-For']
);

$allowlist = new IpAllowlistMiddleware(
    allowedCidrs: [
        '198.51.100.0/24', // partner egress
        '203.0.113.42',    // single bastion host
        '2001:db8::/32',
    ],
    ipResolver: $resolver,
    failClosed: true
);

$router->post('/webhooks/partner', $handler)
    ->middleware([$allowlist])
    ->publicRoute();
```

## Constructor

```php
new IpAllowlistMiddleware(
    array $allowedCidrs,
    ClientIpResolverInterface $ipResolver,
    bool $failClosed = true
);
```

- `allowedCidrs` — list of IPv4/IPv6 CIDRs or single hosts. Validated at construction; malformed entries throw.
- `ipResolver` — anything implementing `ClientIpResolverInterface`. In practice this is `TrustedProxyClientIpResolver` for proxy-aware deployments.
- `failClosed` — `true` (default) returns `403 client_ip_unavailable` when the resolver returns `null`. `false` lets the request proceed when no IP can be resolved (rare; only useful for non-HTTP contexts).

## Behavior

| Resolved IP | Result |
|---|---|
| `null` and `failClosed: true` | `403 client_ip_unavailable` |
| `null` and `failClosed: false` | passes to handler |
| matches any allowed CIDR | passes to handler with `clientIp` attribute set |
| outside every allowed CIDR | `403 client_ip_not_allowed` |

On success, `$ctx->attributes['clientIp']` carries the resolved IP. Audit middleware and handlers can read it without resolving again.

## Combining with HMAC, JWT, and other auth

`IpAllowlistMiddleware` is a network-level gate. It does not authenticate the caller — it only constrains where the caller can come from. Stack it with whatever authenticates the request body:

```php
$router->post('/webhooks/partner', $handler)
    ->middleware([
        $allowlist,         // 403 if outside CIDRs
        $hmacSignature,     // 401 if signature is bad
    ])
    ->publicRoute();
```

Order matters. Putting the allowlist first short-circuits unauthorized networks before any expensive crypto runs.

## Validation checklist

- a request from inside `allowedCidrs` returns `200`;
- a request from outside returns `403 client_ip_not_allowed`;
- with `failClosed: true`, a request whose IP cannot be resolved returns `403 client_ip_unavailable`;
- handlers can read `$ctx->attributes['clientIp']` after the middleware passes.

## Common mistakes

- Using the legacy `Http\ClientIpResolver` directly without `trustedProxies`. The allowlist will then match against the proxy IP, not the real client. Configure the trusted proxy list first.
- Allowlisting `0.0.0.0/0`. That defeats the middleware. If you actually want "any IP, but require auth," remove the middleware instead.
- Using the allowlist as a substitute for auth on a public-internet endpoint. IP space is enumerable and shared (NAT, dynamic IPs); pair it with a real auth middleware.
