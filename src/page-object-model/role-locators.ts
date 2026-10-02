import type { Locator } from "@playwright/test";

export type RoleLocators = Record<Role, RoleLocator>;

interface RoleLocator {
  (options?: RoleLocatorOptions): Locator;
  (name: string | RegExp, options?: RoleLocatorOptions): Locator;
}

type RoleLocatorOptions = Omit<GetByRoleOptions, "name">;

type Role = Parameters<Locator["getByRole"]>[0];

type GetByRoleOptions = Parameters<Locator["getByRole"]>[1];

const ROLES = [
  "alert",
  "alertdialog",
  "application",
  "article",
  "banner",
  "blockquote",
  "button",
  "caption",
  "cell",
  "checkbox",
  "code",
  "columnheader",
  "combobox",
  "complementary",
  "contentinfo",
  "definition",
  "deletion",
  "dialog",
  "directory",
  "document",
  "emphasis",
  "feed",
  "figure",
  "form",
  "generic",
  "grid",
  "gridcell",
  "group",
  "heading",
  "img",
  "insertion",
  "link",
  "list",
  "listbox",
  "listitem",
  "log",
  "main",
  "marquee",
  "math",
  "meter",
  "menu",
  "menubar",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "navigation",
  "none",
  "note",
  "option",
  "paragraph",
  "presentation",
  "progressbar",
  "radio",
  "radiogroup",
  "region",
  "row",
  "rowgroup",
  "rowheader",
  "scrollbar",
  "search",
  "searchbox",
  "separator",
  "slider",
  "spinbutton",
  "status",
  "strong",
  "subscript",
  "superscript",
  "switch",
  "tab",
  "table",
  "tablist",
  "tabpanel",
  "term",
  "textbox",
  "time",
  "timer",
  "toolbar",
  "tooltip",
  "tree",
  "treegrid",
  "treeitem",
] as const satisfies ReadonlyArray<Role>;

const DEFAULT_OPTIONS: GetByRoleOptions = {
  exact: true,
};

/**
 * Creates a set of locator functions for every ARIA role, so tests don't
 * have to repeat `getByRole` and its role string throughout a page object.
 *
 * Every generated locator applies `exact: true` by default, keeping name
 * matches from accidentally matching unrelated elements with a similar
 * accessible name. This can be overridden per call through `options`, or
 * replaced entirely for every locator by passing a custom `defaultOptions`.
 *
 * The accessible name can be omitted when an element should be located by
 * role alone, in which case `options` can be passed as the first argument.
 *
 * @param locator - The page or locator to scope the role locators to
 * @param defaultOptions - Optional. Options applied to every generated locator, overridden by per-call options; defaults to `{ exact: true }`
 * @returns A `RoleLocators` object with one locator function per ARIA role
 *
 * @example
 * ```ts
 * const { button, textbox } = roleLocators(page);
 *
 * await textbox("Email").fill("user@example.com");
 * await button("Submit").click();
 * ```
 */
export function roleLocators(
  locator: Pick<Locator, "getByRole">,
  defaultOptions: GetByRoleOptions = DEFAULT_OPTIONS,
): RoleLocators {
  function getByRole(role: Role): RoleLocator {
    return (
      nameOrOptions?: string | RegExp | RoleLocatorOptions,
      options?: RoleLocatorOptions,
    ) => {
      if (
        typeof nameOrOptions === "string" ||
        nameOrOptions instanceof RegExp
      ) {
        return locator.getByRole(role, {
          name: nameOrOptions,
          ...defaultOptions,
          ...options,
        });
      }

      return locator.getByRole(role, { ...defaultOptions, ...nameOrOptions });
    };
  }

  return Object.fromEntries(
    ROLES.map((role) => [role, getByRole(role)]),
  ) as RoleLocators;
}
