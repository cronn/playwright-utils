# CSP Report

## Detected Directives

| Directive                   | Value               |
| --------------------------- | ------------------- |
| `upgrade-insecure-requests` | _none_              |
| `trusted-types`             | `angular`           |
| `require-trusted-types-for` | `'script'`          |
| `default-src`               | `'self'`            |
| `script-src`                | `'nonce-[NONCE_0]'` |
| `object-src`                | `'none'`            |
| `base-uri`                  | `'none'`            |
| `form-action`               | `'self'`            |
| `frame-ancestors`           | `'none'`            |

## Recommendations

- `style-src`: Add a nonce source
- `style-src`: Remove `'self'` (inherited from `default-src`)
