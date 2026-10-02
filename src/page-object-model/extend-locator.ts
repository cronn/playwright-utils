import type { Locator } from "@playwright/test";

// `toString` is excluded, since every object has it
type WithoutLocatorKeys = Partial<
  Record<Exclude<keyof Locator, "toString">, never>
>;

export type ExtendedLocator<TExtensions extends WithoutLocatorKeys> = Locator &
  TExtensions;

/**
 * Extends a `Locator` with custom properties and functions while retaining the full `Locator` API.
 *
 * Extensions must not override members of `Locator`. Locators derived from the extended locator
 * (e.g. via `first()`, `filter()` or `locator()`) are plain `Locator`s without the extensions.
 *
 * Methods of `Locator` are bound to the original locator on every access, so accessing the same method
 * twice returns different function instances (e.g. `extended.click !== extended.click`).
 *
 * @param locator The locator to extend
 * @param createExtensions Creates the extensions, receiving the original locator
 */
export function extendLocator<TExtensions extends object & WithoutLocatorKeys>(
  locator: Locator,
  createExtensions: (locator: Locator) => TExtensions,
): ExtendedLocator<TExtensions> {
  const extensions = createExtensions(locator);

  return new Proxy(locator, {
    get(target, property) {
      if (isOwnKeyOf(extensions, property)) {
        return extensions[property];
      }
      const value: unknown = Reflect.get(target, property, target);
      return typeof value === "function" && property !== "constructor"
        ? (value as (...args: Array<unknown>) => unknown).bind(target)
        : value;
    },
    has(target, property) {
      return isOwnKeyOf(extensions, property) || Reflect.has(target, property);
    },
  }) as ExtendedLocator<TExtensions>;
}

function isOwnKeyOf<T extends object>(
  object: T,
  key: PropertyKey,
): key is keyof T {
  return Object.hasOwn(object, key);
}
