export function maskedValue(name: string): string {
  const normalizedName = name.toUpperCase().replace(/[ -.:,;]/g, "_");
  return `[${normalizedName}]`;
}

export function maskedValueWithIndex(name: string): (index: number) => string {
  return (index: number) => maskedValue(`${name}_${index}`);
}
