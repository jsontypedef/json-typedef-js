import { readFileSync } from "fs";
import {
  isSchema,
  validate,
  isValidSchema,
  MaxDepthExceededError
} from "./index";

describe("validation", () => {
  it("supports limited depth", () => {
    const schema = { definitions: { foo: { ref: "foo" } }, ref: "foo" };
    const instance = null;

    expect(() =>
      validate(schema, instance, { maxDepth: 5, maxErrors: 0 })
    ).toThrow(MaxDepthExceededError);
  });

  it("supports limited errors", () => {
    const schema = { elements: { type: "string" as const } };
    const instance = [null, null, null, null, null];

    expect(
      validate(schema, instance, { maxDepth: 0, maxErrors: 3 })
    ).toHaveLength(3);
  });
});

describe("json-typedef-spec", () => {
  describe("invalid_schemas", () => {
    const testCases: { [name: string]: unknown } = JSON.parse(
      readFileSync("json-typedef-spec/tests/invalid_schemas.json", "utf-8")
    );

    for (const [name, invalidSchema] of Object.entries(testCases)) {
      it(name, () => {
        expect(isSchema(invalidSchema) && isValidSchema(invalidSchema)).toBe(
          false
        );
      });
    }
  });

  describe("validation", () => {
    interface TestCase {
      schema: unknown;
      instance: unknown;
      errors: TestCaseError[];
    }

    interface TestCaseError {
      instancePath: string[];
      schemaPath: string[];
    }

    const testCases: { [name: string]: TestCase } = JSON.parse(
      readFileSync("json-typedef-spec/tests/validation.json", "utf-8")
    );

    // See comment in index.ts around why we skip this these particular timestamp
    // test cases.
    const SKIPPED_TESTS = [
      "timestamp type schema - 1990-12-31T23:59:60Z",
      "timestamp type schema - 1990-12-31T15:59:60-08:00"
    ];

    for (const [name, { schema, instance, errors }] of Object.entries(
      testCases
    )) {
      it(name, () => {
        expect(isSchema(schema)).toBe(true);

        if (SKIPPED_TESTS.includes(name)) {
          return;
        }

        if (isSchema(schema)) {
          expect(validate(schema, instance)).toEqual(errors);
        }
      });
    }
  });
});
