# Response Header Report

## Detected Headers

| Header                         | Value                                        |
| ------------------------------ | -------------------------------------------- |
| `cache-control`                | `no-store`                                   |
| `content-security-policy`      | `default-src 'none'; frame-ancestors 'none'` |
| `content-type`                 | `application/json`                           |
| `cross-origin-opener-policy`   | `same-origin`                                |
| `cross-origin-resource-policy` | `same-origin`                                |
| `strict-transport-security`    | `max-age=31536000; includeSubDomains`        |
| `x-content-type-options`       | `nosniff`                                    |
| `x-robots-tag`                 | `noindex`                                    |
| `access-control-allow-origin`  | `*`                                          |

## Recommendations

- `access-control-allow-origin`: Remove header
