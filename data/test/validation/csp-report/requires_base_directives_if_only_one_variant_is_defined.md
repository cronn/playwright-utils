# CSP Report

## Detected Directives

| Directive                   | Value               |
| --------------------------- | ------------------- |
| `upgrade-insecure-requests` | _none_              |
| `trusted-types`             | `angular`           |
| `require-trusted-types-for` | `'script'`          |
| `default-src`               | `'self'`            |
| `script-src-elem`           | `'nonce-[NONCE_0]'` |
| `style-src`                 | `'nonce-[NONCE_1]'` |
| `object-src`                | `'none'`            |
| `base-uri`                  | `'none'`            |
| `form-action`               | `'self'`            |
| `frame-ancestors`           | `'none'`            |

## Recommendations

- `script-src`: Add a nonce source
- `script-src`: Remove `'self'` (inherited from `default-src`)
