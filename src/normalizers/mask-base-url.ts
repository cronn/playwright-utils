import type { Normalizer } from "@cronn/playwright-file-snapshots";
import { maskString, stringNormalizer } from "@cronn/playwright-file-snapshots";

import { maskedValue } from "./masked-value";

/**
 * Creates a normalizer that replaces occurrences of the base URL with
 * `[BASE_URL]`, keeping file snapshots stable across environments.
 *
 * @param baseURL - Base URL to mask; if `undefined`, values are left unchanged
 */
export function maskBaseURL<TValue>(
  baseURL: string | undefined,
): Normalizer<TValue> {
  if (baseURL === undefined) {
    return identity<TValue>;
  }

  return stringNormalizer(maskString(baseURL, maskedValue("BASE_URL")));
}

function identity<TValue>(value: TValue): TValue {
  return value;
}
