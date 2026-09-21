import { type Page, test } from "@playwright/test";

import { roleLocators } from "../src";
import { expect } from "../src/test/fixtures";
import { html } from "../src/test/utils";

async function setupTest(page: Page, content: string): Promise<void> {
  await page.setContent(content);
}

test("locates an element by role and accessible name", async ({ page }) => {
  await setupTest(page, html`<button>Save</button>`);

  const { button } = roleLocators(page);

  await expect(button("Save")).toHaveCount(1);
});

test("uses exact matching by default", async ({ page }) => {
  await setupTest(
    page,
    html`
      <button>Save</button>
      <button>Save as draft</button>
    `,
  );

  const { button } = roleLocators(page);

  await expect(button("Save")).toHaveText("Save");
});

test("supports overriding the default options", async ({ page }) => {
  await setupTest(
    page,
    html`
      <button>Save</button>
      <button>Save as draft</button>
    `,
  );

  const { button } = roleLocators(page, { exact: false });

  await expect(button("Save")).toHaveCount(2);
});

test("locates elements by role alone when no name is given", async ({
  page,
}) => {
  await setupTest(
    page,
    html`
      <button>Save</button>
      <button>Save as draft</button>
    `,
  );

  const { button } = roleLocators(page);

  await expect(button()).toHaveCount(2);
});

test("accepts options as the first argument when no name is given", async ({
  page,
}) => {
  await setupTest(
    page,
    html`
      <button>Add</div>
      <button disabled>Edit</div>
    `,
  );

  const { button } = roleLocators(page);

  await expect(button({ disabled: false })).toHaveCount(1);
});
