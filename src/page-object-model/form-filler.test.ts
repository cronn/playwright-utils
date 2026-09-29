import { expect, expectTypeOf, test, vi } from "vitest";

import { formFiller } from "./form-filler";

interface Registration {
  name?: string;
  age?: number;
  newsletter?: boolean;
}

interface Address {
  street?: string;
  city?: string;
}

function createFiller<TValue>() {
  return vi.fn<(value: TValue) => Promise<void>>().mockResolvedValue();
}

function createRecordingFiller(calls: Array<string>, name: string) {
  return vi.fn(() => {
    calls.push(name);
    return Promise.resolve();
  });
}

test("calls fill on fillable fields", async () => {
  const name = { fill: createFiller<string>() };

  await formFiller<Registration>({
    name,
    age: createFiller(),
    newsletter: createFiller(),
  })({
    name: "Jane",
  });

  expect(name.fill).toHaveBeenCalledExactlyOnceWith("Jane");
});

test("calls filler functions", async () => {
  const name = createFiller<string>();

  await formFiller<{ name: string }>({ name })({ name: "Jane" });

  expect(name).toHaveBeenCalledExactlyOnceWith("Jane");
});

test("skips fields with undefined values", async () => {
  const name = createFiller<string>();
  const age = createFiller<number>();

  await formFiller<Registration>({ name, age, newsletter: createFiller() })({
    age: 42,
  });

  expect(name).not.toHaveBeenCalled();
  expect(age).toHaveBeenCalledExactlyOnceWith(42);
});

test("fills falsy values", async () => {
  const name = createFiller<string>();
  const age = createFiller<number>();
  const newsletter = createFiller<boolean>();

  await formFiller<Registration>({ name, age, newsletter })({
    name: "",
    age: 0,
    newsletter: false,
  });

  expect(name).toHaveBeenCalledExactlyOnceWith("");
  expect(age).toHaveBeenCalledExactlyOnceWith(0);
  expect(newsletter).toHaveBeenCalledExactlyOnceWith(false);
});

test("fills fields in the order of the fields object", async () => {
  const calls: Array<string> = [];

  await formFiller<Registration>({
    newsletter: createRecordingFiller(calls, "newsletter"),
    name: createRecordingFiller(calls, "name"),
    age: createRecordingFiller(calls, "age"),
  })({ name: "Jane", age: 42, newsletter: true });

  expect(calls).toEqual(["newsletter", "name", "age"]);
});

test("waits for each field before filling the next one", async () => {
  const calls: Array<string> = [];

  await formFiller<Registration>({
    name: async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      calls.push("name");
    },
    age: createRecordingFiller(calls, "age"),
    newsletter: createFiller(),
  })({ name: "Jane", age: 42 });

  expect(calls).toEqual(["name", "age"]);
});

test("can be called multiple times", async () => {
  const name = createFiller<string>();
  const fill = formFiller<{ name: string }>({ name });

  await fill({ name: "Jane" });
  await fill({ name: "John" });

  expect(name).toHaveBeenNthCalledWith(1, "Jane");
  expect(name).toHaveBeenNthCalledWith(2, "John");
});

test("supports nested form fillers", async () => {
  const street = createFiller<string>();
  const city = createFiller<string>();

  await formFiller<{ address: Address }>({
    address: formFiller({ street, city }),
  })({ address: { street: "Main Street 1", city: "Springfield" } });

  expect(street).toHaveBeenCalledExactlyOnceWith("Main Street 1");
  expect(city).toHaveBeenCalledExactlyOnceWith("Springfield");
});

test("infers the data type from the fields", async () => {
  const name = { fill: createFiller<string>() };
  const age = createFiller<number>();
  const street = createFiller<string>();

  const fill = formFiller({
    name,
    age,
    address: formFiller({ street }),
  });
  await fill({ name: "Jane", address: { street: "Main Street 1" } });

  expectTypeOf(fill).parameter(0).toEqualTypeOf<{
    name?: string;
    age?: number;
    address?: { street?: string };
  }>();
  expect(name.fill).toHaveBeenCalledExactlyOnceWith("Jane");
  expect(age).not.toHaveBeenCalled();
  expect(street).toHaveBeenCalledExactlyOnceWith("Main Street 1");
});

test("rejects invalid fields and data on type level", () => {
  const fill = formFiller({ name: createFiller<string>() });
  // @ts-expect-error -- value doesn't match the type of the field
  void fill({ name: 42 });

  formFiller({
    // @ts-expect-error -- value of filler function without parameter type is unknown
    name: (name) => createFiller<string>()(name),
  });

  // @ts-expect-error -- field missing for a required key of the explicit data type
  formFiller<{ name: string; age: number }>({ name: createFiller() });

  // @ts-expect-error -- field missing for an optional key of the explicit data type
  formFiller<Registration>({ name: createFiller(), age: createFiller() });
});

test("accepts partial data for an explicit data type", async () => {
  const name = createFiller<string>();

  const fill = formFiller<{ name: string }>({ name });
  await fill({});

  expectTypeOf(fill).parameter(0).toEqualTypeOf<{ name?: string }>();
  expect(name).not.toHaveBeenCalled();
});

test("infers filler function parameters of nested form fillers", async () => {
  const newsletter = createFiller<boolean>();

  await formFiller<{ settings: { newsletter?: boolean } }>({
    settings: formFiller({
      newsletter: (subscribe) => newsletter(subscribe),
    }),
  })({ settings: { newsletter: true } });

  expect(newsletter).toHaveBeenCalledExactlyOnceWith(true);
});
