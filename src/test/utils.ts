export function html(
  strings: TemplateStringsArray,
  ...values: Array<string>
): string {
  return strings.reduce((result, str, i) => {
    return result + str + (values[i] ?? "");
  }, "");
}
