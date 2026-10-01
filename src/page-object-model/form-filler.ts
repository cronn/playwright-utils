interface Fillable<TValue> {
  fill: Filler<TValue>;
}

type Filler<TValue> = (value: TValue) => Promise<void>;

export type FormFields<TData> = {
  [K in keyof TData]:
    | Fillable<Exclude<TData[K], undefined>>
    | Filler<Exclude<TData[K], undefined>>;
};

/**
 * Creates a filler function that fills a form declaratively from a data
 * object, e.g. as the `fill` method of a page object.
 *
 * Each key of `fields` maps a key of the data to a form input: either an
 * object with a `fill` method (such as a `Locator` or a nested page object) or
 * a filler function receiving the value. Fields are filled one after another
 * in the order of the keys in `fields`, and fields whose value is `undefined`
 * are skipped.
 *
 * As the returned function is a filler itself, it can be used as a field of
 * another form filler to fill nested data.
 *
 * @param fields - Mapping from each key of the data to the input to fill
 * @returns A function filling the form with the given data
 * @example
 * ```ts
 * const { checkbox, textbox } = roleLocators(page);
 *
 * const registrationForm = {
 *   fill: formFiller<Registration>({
 *     name: textbox("Name"),
 *     acceptTerms: (accepted) => checkbox("Accept terms").setChecked(accepted),
 *   }),
 * };
 * ```
 */
export function formFiller<TData extends object>(
  fields: FormFields<NoInfer<TData>>,
): Filler<TData> {
  return async (data) => {
    for (const key of Object.keys(fields) as Array<keyof TData>) {
      const value = data[key];
      if (value === undefined) {
        continue;
      }
      const filler = fields[key] as Fillable<unknown> | Filler<unknown>;
      if (typeof filler === "function") {
        await filler(value);
      } else {
        await filler.fill(value);
      }
    }
  };
}
