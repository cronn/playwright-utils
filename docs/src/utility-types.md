# Utility Types

## `PlaywrightTarget`

Union of the Playwright types which can be targeted by an assertion or interaction: a whole `Page` or a single `Locator`.

```ts
type PlaywrightTarget = Page | Locator;
```
