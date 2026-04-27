---
title: Metrics
---

`MetricsMiddleware` emits request counters and latency observations.

## Minimal example

```php
use BetterRoute\Middleware\Observability\MetricsMiddleware;
use BetterRoute\Observability\PrometheusMetricSink;

$metrics = new MetricsMiddleware(
    metrics: new PrometheusMetricSink(),
    metricPrefix: 'better_route_'
);
```

## Emitted metrics

- `${prefix}requests_total`
- `${prefix}request_duration_seconds`
- `${prefix}errors_total` (only on 4xx/5xx or thrown exceptions)

Default labels:

- `route`
- `method`
- `status_class` (`2xx`, `4xx`, `5xx`, ...)

Error metric adds:

- `error_code`

## Prometheus rendering

`PrometheusMetricSink::render()` outputs counter and summary lines ready for scrape/export.

## Common mistakes

- Missing error-code extraction from structured responses
- Inconsistent metric prefix across apps
- Using route templates that explode label cardinality

## Validation checklist

- successful + failed calls increment `requests_total`
- failures increment `errors_total`
- duration observations are emitted for all outcomes
