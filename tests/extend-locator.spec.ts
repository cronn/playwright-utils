import { type Page, test } from "@playwright/test";

import { type ExtendedLocator, extendLocator } from "../src";
import { expect } from "../src/test/fixtures";
import { html } from "../src/test/utils";

async function setupTest(page: Page, content: string): Promise<void> {
  await page.setContent(content);
}

test("provides custom properties and functions", async ({ page }) => {
  await setupTest(page, html`<input aria-label="Name" />`);

  const textbox = extendLocator(page.getByRole("textbox"), (locator) => ({
    label: "Name",
    async fillTwice(value: string) {
      await locator.fill(`${value}${value}`);
    },
  }));

  await textbox.fillTwice("ab");

  expect(textbox.label).toBe("Name");
  await expect(textbox).toHaveValue("abab");
});

test("retains the Locator API", async ({ page }) => {
  await setupTest(page, html`<button>Save</button>`);

  const locator = page.getByRole("button", { name: "Save" });
  const button = extendLocator(locator, () => ({ name: "Save" }));

  await button.click();

  await expect(button).toBeVisible();
  await expect(button).toHaveText("Save");
  expect(button instanceof locator.constructor).toBe(true);
  expect(button.constructor).toBe(locator.constructor);
  expect(String(button)).toBe(String(locator));
});

test("can be combined with other locators", async ({ page }) => {
  await setupTest(
    page,
    html`
      <button>Save</button>
      <button>Cancel</button>
    `,
  );

  const save = extendLocator(page.getByText("Save"), () => ({}));

  await expect(page.getByText("Cancel").or(save)).toHaveCount(2);
  await expect(page.getByRole("button").and(save)).toHaveCount(1);
});

test("supports the in operator for extensions and Locator members", ({
  page,
}) => {
  const extended = extendLocator(page.locator("body"), () => ({ custom: 1 }));

  expect("custom" in extended).toBe(true);
  expect("click" in extended).toBe(true);
  expect("unknown" in extended).toBe(false);
});

test("rejects extensions overriding Locator members", ({ page }) => {
  // @ts-expect-error -- `click` is a member of Locator
  extendLocator(page.locator("body"), () => ({ click: "override" }));

  // @ts-expect-error -- `click` is a member of Locator
  extendLocator<{ click: string }>(page.locator("body"), () => ({
    click: "override",
  }));
});

test("rejects ExtendedLocator types overriding Locator members", () => {
  // @ts-expect-error -- `click` is a member of Locator
  const invalid: ExtendedLocator<{ click: string }> | undefined = undefined;

  expect(invalid).toBeUndefined();
});
