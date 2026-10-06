# CSP Report

## Detected Directives

| Directive                   | Value                                                        |
| --------------------------- | ------------------------------------------------------------ |
| `upgrade-insecure-requests` | _none_                                                       |
| `trusted-types`             | `angular`                                                    |
| `require-trusted-types-for` | `'script'`                                                   |
| `default-src`               | `'self'`                                                     |
| `script-src`                | `'nonce-[NONCE_0]' 'strict-dynamic' https://cdn.example.com` |
| `style-src`                 | `'nonce-[NONCE_1]' 'unsafe-inline'`                          |
| `img-src`                   | `'self' data: https://images.example.com`                    |
| `object-src`                | `'none'`                                                     |
| `base-uri`                  | `'none'`                                                     |
| `form-action`               | `'self'`                                                     |
| `frame-ancestors`           | `'none'`                                                     |

## Recommendations

- `script-src`: Remove `https://cdn.example.com`
- `style-src`: Remove `'unsafe-inline'`
- `img-src`: Remove `https://images.example.com`
