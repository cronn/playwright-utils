import type { Normalizer } from "@cronn/playwright-file-snapshots";
import { maskString, stringNormalizer } from "@cronn/playwright-file-snapshots";

import { maskedValue } from "./masked-value";

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
