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

    for (const [name, { schema, instance, errors }] of Object.entries(
      testCases
    )) {
      it(name, () => {
        expect(isSchema(schema)).toBe(true);

        if (isSchema(schema)) {
          expect(validate(schema, instance)).toEqual(errors);
        }
      });
    }
  });
});
