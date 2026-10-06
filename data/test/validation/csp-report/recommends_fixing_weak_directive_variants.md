# CSP Report

## Detected Directives

| Directive                   | Value                                     |
| --------------------------- | ----------------------------------------- |
| `upgrade-insecure-requests` | _none_                                    |
| `trusted-types`             | `angular`                                 |
| `require-trusted-types-for` | `'script'`                                |
| `default-src`               | `'self'`                                  |
| `script-src`                | `'nonce-[NONCE_0]'`                       |
| `script-src-elem`           | `'unsafe-inline' https://cdn.example.com` |
| `script-src-attr`           | `'unsafe-inline'`                         |
| `style-src`                 | `'nonce-[NONCE_1]'`                       |
| `style-src-elem`            | `'nonce-[NONCE_1]' 'unsafe-inline'`       |
| `style-src-attr`            | `'unsafe-hashes'`                         |
| `object-src`                | `'none'`                                  |
| `base-uri`                  | `'none'`                                  |
| `form-action`               | `'self'`                                  |
| `frame-ancestors`           | `'none'`                                  |

## Recommendations

- `script-src-elem`: Add a nonce source
- `script-src-elem`: Remove `'unsafe-inline'`
- `script-src-elem`: Remove `https://cdn.example.com`
- `script-src-attr`: Add `'none'`
- `script-src-attr`: Remove `'unsafe-inline'`
- `style-src-elem`: Remove `'unsafe-inline'`
- `style-src-attr`: Add `'none'`
- `style-src-attr`: Remove `'unsafe-hashes'`
