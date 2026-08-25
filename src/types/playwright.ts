import type { Locator, Page } from "@playwright/test";

/**
 * Anything that can be targeted by Playwright actions: a whole page or a
 * locator scoped to a part of it.
 */
export type PlaywrightTarget = Page | Locator;
