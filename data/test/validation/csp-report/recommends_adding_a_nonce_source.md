# CSP Report

## Detected Directives

| Directive                   | Value               |
| --------------------------- | ------------------- |
| `upgrade-insecure-requests` | _none_              |
| `trusted-types`             | `angular`           |
| `require-trusted-types-for` | `'script'`          |
| `default-src`               | `'self'`            |
| `script-src`                | `'strict-dynamic'`  |
| `style-src`                 | `'nonce-[NONCE_0]'` |
| `object-src`                | `'none'`            |
| `base-uri`                  | `'none'`            |
| `form-action`               | `'self'`            |
| `frame-ancestors`           | `'none'`            |

## Recommendations

- `script-src`: Add a nonce source
