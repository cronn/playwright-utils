# CSP Report

## Detected Directives

| Directive                   | Value                        |
| --------------------------- | ---------------------------- |
| `upgrade-insecure-requests` | _none_                       |
| `trusted-types`             | `angular`                    |
| `require-trusted-types-for` | `'script'`                   |
| `default-src`               | `'self'`                     |
| `script-src`                | `'nonce-[NONCE_0]'`          |
| `style-src`                 | `'nonce-[NONCE_1]'`          |
| `img-src`                   | `https://images.example.com` |
| `object-src`                | `https://cdn.example.com`    |
| `base-uri`                  | `'none'`                     |
| `form-action`               | `https://api.example.com`    |
| `frame-ancestors`           | `'none'`                     |

## Recommendations

- `img-src`: Add `'self' data:`
- `img-src`: Remove `https://images.example.com`
- `object-src`: Add `'none'`
- `object-src`: Remove `https://cdn.example.com`
- `form-action`: Add `'self'`
- `form-action`: Remove `https://api.example.com`
