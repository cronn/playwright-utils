# Response Header Report

## Detected Headers

| Header                         | Value                                      |
| ------------------------------ | ------------------------------------------ |
| `cache-control`                | `no-store`                                 |
| `content-security-policy`      | `default-src 'self'`                       |
| `content-type`                 | `text/html`                                |
| `cross-origin-opener-policy`   | `same-origin`                              |
| `cross-origin-resource-policy` | `same-origin`                              |
| `strict-transport-security`    | `max-age=31536000; includeSubDomains`      |
| `x-content-type-options`       | `nosniff`                                  |
| `x-robots-tag`                 | `noindex`                                  |
| `permissions-policy`           | `camera=(), microphone=(), geolocation=()` |
| `referrer-policy`              | `no-referrer`                              |
| `x-frame-options`              | `DENY`                                     |
| `access-control-allow-origin`  | `*`                                        |
| `x-xss-protection`             | `1; mode=block`                            |

## Recommendations

- `access-control-allow-origin`: Remove header
- `x-xss-protection`: Remove header
