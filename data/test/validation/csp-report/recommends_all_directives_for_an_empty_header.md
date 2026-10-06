# CSP Report

## Detected Directives

None

## Recommendations

- `upgrade-insecure-requests`: Missing, add `upgrade-insecure-requests`
- `trusted-types`: Missing, add `trusted-types`
- `require-trusted-types-for`: Missing, add `require-trusted-types-for 'script'`
- `default-src`: Missing, add `default-src 'self'`
- `script-src`: Missing, add `script-src 'nonce-<random>'`
- `style-src`: Missing, add `style-src 'nonce-<random>'`
- `img-src`: Missing, add `img-src 'self' data:`
- `font-src`: Missing, add `font-src 'self'`
- `connect-src`: Missing, add `connect-src 'self'`
- `object-src`: Missing, add `object-src 'none'`
- `base-uri`: Missing, add `base-uri 'self'`
- `form-action`: Missing, add `form-action 'self'`
- `frame-ancestors`: Missing, add `frame-ancestors 'none'`
