# Forms

## Form Filler

Filling a form in a page object usually turns into a long list of imperative calls, each guarded by a check whether the value was provided at all. `formFiller` replaces this with a declarative mapping: given a `fields` object that maps each data key to a form input, it returns a function that takes a data object and fills every input for which a value is provided.

### Usage

```ts
import { formFiller, roleLocators } from "@cronn/playwright-utils";
import type { Page } from "@playwright/test";

interface Registration {
  name: string;
  email?: string;
}

function createRegistrationForm(page: Page) {
  const { button, textbox } = roleLocators(page);

  return {
    fill: formFiller<Registration>({
      name: textbox("Name"),
      email: textbox("Email"),
    }),
    submitButton: button("Register"),
  };
}
```

A test then only describes _what_ to enter, not _how_ to enter it:

```ts
import { test } from "@playwright/test";

test("registers a new user", async ({ page }) => {
  const registrationForm = createRegistrationForm(page);

  await registrationForm.fill({ name: "Jane Doe", email: "jane@example.com" });
  await registrationForm.submitButton.click();
});
```

The type of the data is set with the type argument, e.g. `formFiller<Registration>`. The `fields` object is type-checked against it: every data key needs a field, and each field has to accept the type of its value. To declare the fields separately, use the `FormFields<TData>` type.

### Locators and Filler Functions

A field can be either:

- a **fillable**, i.e. any object with a `fill(value)` method, such as a Playwright `Locator`, or
- a **filler function** `(value) => Promise<void>` for inputs that aren't filled with `fill`, such as checkboxes, selects or custom widgets.

```ts
import { formFiller, roleLocators } from "@cronn/playwright-utils";
import type { Page } from "@playwright/test";

interface Registration {
  name: string;
  country?: string;
  acceptTerms?: boolean;
}

function createRegistrationForm(page: Page) {
  const { checkbox, combobox, textbox } = roleLocators(page);

  return {
    fill: formFiller<Registration>({
      name: textbox("Name"),
      country: (country) => combobox("Country").selectOption(country),
      acceptTerms: (accepted) => checkbox("Accept terms").setChecked(accepted),
    }),
  };
}
```

### Optional Values

Fields whose value is `undefined` are skipped, so a test can pass only the values that matter for it and leave all other inputs untouched:

```ts
await registrationForm.fill({ name: "Jane Doe" });
```

Falsy values such as `""`, `0` or `false` are still filled. For example, `acceptTerms: false` unchecks the checkbox.

### Fill Order

Inputs are filled one after another, in the order of the keys in the `fields` object. The order of the keys in the data object doesn't matter. This helps with dependent inputs, e.g. a state select that is only populated after a country was selected:

```ts
formFiller<Address>({
  country: (country) => combobox("Country").selectOption(country),
  state: (state) => combobox("State").selectOption(state),
});
```

### Nested Data

The function returned by `formFiller` is a filler function itself. When the data contains nested objects, a nested `formFiller` can therefore be used as a field. Its type argument is inferred from the enclosing form:

```ts
interface Registration {
  name: string;
  address?: Address;
}

interface Address {
  street?: string;
  city?: string;
}

function createRegistrationForm(page: Page) {
  const { textbox } = roleLocators(page);

  return {
    fill: formFiller<Registration>({
      name: textbox("Name"),
      address: formFiller({
        street: textbox("Street"),
        city: textbox("City"),
      }),
    }),
  };
}
```

If the nested part of the form is a page object on its own, it can be used as a field directly, because its `fill` method makes it fillable:

```ts
import type { Locator } from "@playwright/test";

function createAddressForm(container: Locator) {
  const { textbox } = roleLocators(container);

  return {
    fill: formFiller<Address>({
      street: textbox("Street"),
      city: textbox("City"),
    }),
  };
}

function createRegistrationForm(page: Page) {
  const { group, textbox } = roleLocators(page);

  return {
    fill: formFiller<Registration>({
      name: textbox("Name"),
      address: createAddressForm(group("Address")),
    }),
  };
}
```
