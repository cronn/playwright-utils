/**
 * Formats a name as a masked placeholder, e.g. `maskedValue("base url")`
 * returns `[BASE_URL]`.
 *
 * @param name - Name of the masked value
 */
export function maskedValue(name: string): string {
  const normalizedName = name.toUpperCase().replace(/[ -.:,;]/g, "_");
  return `[${normalizedName}]`;
}

/**
 * Creates a factory for indexed masked placeholders, e.g. `[USER_1]`.
 *
 * @param name - Name of the masked value
 * @returns A function mapping an index to a masked placeholder
 */
export function maskedValueWithIndex(name: string): (index: number) => string {
  return (index: number) => maskedValue(`${name}_${index}`);
}
