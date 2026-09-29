import { type Locator, type Page, test } from "@playwright/test";

import { formFiller, roleLocators } from "../src";
import { expect } from "../src/test/fixtures";
import { html } from "../src/test/utils";

interface Registration {
  name?: string;
  email?: string;
  country?: string;
  acceptTerms?: boolean;
  address?: Address;
}

interface Address {
  street?: string;
  city?: string;
}

async function setupTest(page: Page): Promise<void> {
  await page.setContent(html`
    <form>
      <label>Name <input name="name" /></label>
      <label>Email <input name="email" /></label>
      <label>
        Country
        <select name="country">
          <option></option>
          <option>Germany</option>
          <option>France</option>
        </select>
      </label>
      <fieldset>
        <legend>Address</legend>
        <label>Street <input name="street" /></label>
        <label>City <input name="city" /></label>
      </fieldset>
      <label><input type="checkbox" name="terms" /> Accept terms</label>
    </form>
  `);
}

function createRegistrationForm(page: Page) {
  const { checkbox, combobox, textbox } = roleLocators(page);

  return {
    fill: formFiller<Registration>({
      name: textbox("Name"),
      email: textbox("Email"),
      country: async (country) => {
        await combobox("Country").selectOption(country);
      },
      address: formFiller({
        street: textbox("Street"),
        city: textbox("City"),
      }),
      acceptTerms: (accepted) => checkbox("Accept terms").setChecked(accepted),
    }),
  };
}

test("fills inputs using locators and filler functions", async ({ page }) => {
  await setupTest(page);
  const { checkbox, combobox, textbox } = roleLocators(page);

  await createRegistrationForm(page).fill({
    name: "Jane Doe",
    email: "jane@example.com",
    country: "Germany",
    acceptTerms: true,
  });

  await expect(textbox("Name")).toHaveValue("Jane Doe");
  await expect(textbox("Email")).toHaveValue("jane@example.com");
  await expect(combobox("Country")).toHaveValue("Germany");
  await expect(checkbox("Accept terms")).toBeChecked();
});

test("fills nested data using a nested form", async ({ page }) => {
  await setupTest(page);
  const { textbox } = roleLocators(page);

  await createRegistrationForm(page).fill({
    address: { street: "Main Street 1", city: "Springfield" },
  });

  await expect(textbox("Street")).toHaveValue("Main Street 1");
  await expect(textbox("City")).toHaveValue("Springfield");
});

test("leaves inputs with undefined values untouched", async ({ page }) => {
  await setupTest(page);
  const { checkbox, textbox } = roleLocators(page);
  await textbox("Email").fill("prefilled@example.com");

  await createRegistrationForm(page).fill({
    name: "Jane Doe",
    address: { city: "Springfield" },
  });

  await expect(textbox("Name")).toHaveValue("Jane Doe");
  await expect(textbox("Email")).toHaveValue("prefilled@example.com");
  await expect(textbox("Street")).toHaveValue("");
  await expect(textbox("City")).toHaveValue("Springfield");
  await expect(checkbox("Accept terms")).not.toBeChecked();
});

test("fills nested data using a fillable page object", async ({ page }) => {
  await setupTest(page);
  const { group, textbox } = roleLocators(page);

  function createAddressForm(container: Locator) {
    const addressLocators = roleLocators(container);

    return {
      fill: formFiller<Address>({
        street: addressLocators.textbox("Street"),
        city: addressLocators.textbox("City"),
      }),
    };
  }

  const fillRegistration = formFiller<Pick<Registration, "address">>({
    address: createAddressForm(group("Address")),
  });

  await fillRegistration({
    address: { street: "Main Street 1", city: "Springfield" },
  });

  await expect(textbox("Street")).toHaveValue("Main Street 1");
  await expect(textbox("City")).toHaveValue("Springfield");
});

test("fills inputs using a form with inferred data type", async ({ page }) => {
  await setupTest(page);
  const { checkbox, combobox, textbox } = roleLocators(page);

  const fillRegistration = formFiller({
    name: textbox("Name"),
    country: async (country: string) => {
      await combobox("Country").selectOption(country);
    },
    address: formFiller({ city: textbox("City") }),
    acceptTerms: (accepted: boolean) =>
      checkbox("Accept terms").setChecked(accepted),
  });

  await fillRegistration({
    name: "Jane Doe",
    country: "France",
    address: { city: "Springfield" },
    acceptTerms: true,
  });

  await expect(textbox("Name")).toHaveValue("Jane Doe");
  await expect(combobox("Country")).toHaveValue("France");
  await expect(textbox("City")).toHaveValue("Springfield");
  await expect(checkbox("Accept terms")).toBeChecked();
});
