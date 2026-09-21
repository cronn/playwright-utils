# Locator Extensions

## Role Locators

Playwright's [`getByRole`](https://playwright.dev/docs/locators#locate-by-role) is the recommended way to locate elements, but repeating the role string and matching options (such as `exact`) across a page object gets verbose. `roleLocators` creates a set of named locator functions for every ARIA role, so page objects only have to pass the accessible name.

### Usage

```ts
import { roleLocators } from "@cronn/playwright-utils";
import { expect, test } from "@playwright/test";

test("submits the form", async ({ page }) => {
  const { button, textbox } = roleLocators(page);

  await textbox("Email").fill("user@example.com");
  await button("Submit").click();

  await expect(button("Submit")).toBeDisabled();
});
```

`roleLocators` accepts anything with a `getByRole` method, so it can be scoped to the page, a `Locator` or a `FrameLocator`.

### Building a reusable page object

`roleLocators` is a convenient building block for a page object: a factory function can spread its locators alongside any other methods the page object needs, without hand-writing a `getByRole` call for every element:

```ts
import { roleLocators } from "@cronn/playwright-utils";
import type { Page } from "@playwright/test";

function createLoginPage(page: Page) {
  const { button, textbox } = roleLocators(page);

  return {
    usernameField: textbox("Username"),
    passwordField: textbox("Password"),
    loginButton: button("Log in"),
  };
}
```

### Default options

Every generated locator applies `exact: true` by default, which keeps a name match from accidentally matching an unrelated element with a similar accessible name (e.g. `button("Save")` matching a `Save as draft` button too). This can be overridden per call:

```ts
const { button } = roleLocators(page);

button("Save", { exact: false });
```

Or replaced entirely for every locator returned by a call, by passing a custom `defaultOptions` object as the second argument:

```ts
const { button } = roleLocators(page, { exact: false });
```

### Locating by role alone

The accessible name can be omitted when an element should be located by role alone. `options` can then be passed as the first argument:

```ts
const { tab } = roleLocators(page);

await expect(tab()).toHaveCount(3);
await expect(tab({ disabled: true })).toBeVisible();
```
