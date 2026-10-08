# Response Header Report

## Detected Headers

| Header                         | Value                            |
| ------------------------------ | -------------------------------- |
| `cache-control`                | `no-store`                       |
| `content-security-policy`      | `default-src 'self'`             |
| `content-type`                 | `text/html`                      |
| `cross-origin-opener-policy`   | `unsafe-none`                    |
| `cross-origin-resource-policy` | `same-origin`                    |
| `strict-transport-security`    | `max-age=3600`                   |
| `x-content-type-options`       | `nosniff`                        |
| `x-robots-tag`                 | `noindex`                        |
| `permissions-policy`           | `camera=()`                      |
| `referrer-policy`              | `unsafe-url`                     |
| `x-frame-options`              | `ALLOW-FROM https://example.com` |

## Recommendations

- `cross-origin-opener-policy`: Change value to `same-origin`
- `strict-transport-security`: Change value to `max-age=31536000; includeSubDomains`
- `permissions-policy`: Change value to `geolocation=(), microphone=(), camera=()`
- `referrer-policy`: Change value to `no-referrer`
- `x-frame-options`: Change value to `DENY`
