import { expect, test, vi } from "vitest";

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
