# Response Header Report

## Detected Headers

| Header                         | Value                                        |
| ------------------------------ | -------------------------------------------- |
| `cache-control`                | `no-store`                                   |
| `content-security-policy`      | `default-src 'none'; frame-ancestors 'none'` |
| `content-type`                 | `application/json`                           |
| `cross-origin-opener-policy`   | `unsafe-none`                                |
| `cross-origin-resource-policy` | `cross-origin`                               |
| `strict-transport-security`    | `max-age=31536000; includeSubDomains`        |
| `x-content-type-options`       | `none`                                       |
| `x-robots-tag`                 | `noindex`                                    |

## Recommendations

- `cross-origin-opener-policy`: Change value to `same-origin`
- `cross-origin-resource-policy`: Change value to `same-origin`
- `x-content-type-options`: Change value to `nosniff`
