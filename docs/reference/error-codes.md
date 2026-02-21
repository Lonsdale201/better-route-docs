---
title: Error Codes
---

## Common contract

All errors are returned under:

- `error.code`
- `error.message`
- `error.requestId`
- `error.details`

## Codes used by built-ins

- `validation_failed` (`400`)
- `invalid_request` (`400`)
- `unauthorized` (`401`)
- `invalid_token` (`401`)
- `invalid_credentials` (`401`)
- `invalid_authorization_header` (`401`)
- `insufficient_scope` (`403`)
- `invalid_nonce` (`403`)
- `not_found` (`404`)
- `conflict` (`409`)
- `idempotency_conflict` (`409`)
- `version_unavailable` (`409`)
- `precondition_failed` (`412`)
- `precondition_required` (`412`)
- `optimistic_lock_failed` (`412`)
- `rate_limited` (`429`)
- `internal_error` (`500`)

## Recommended mapping practice

- use domain-specific `ApiException` codes for predictable client handling
- keep message human-readable and details machine-readable
- always propagate requestId to logs and support workflows
