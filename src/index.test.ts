import { readFileSync } from "fs";
import { isSchema, validate, isValidSchema } from ".";

describe("invalid schemas", () => {
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

// describe("validation", () => {
//   interface TestCase {
//     schema: unknown;
//     instance: unknown;
//     errors: TestCaseError[];
//   }

//   interface TestCaseError {
//     instancePath: string[];
//     schemaPath: string[];
//   }

//   const testCases: { [name: string]: TestCase } = JSON.parse(
//     readFileSync("json-typedef-spec/tests/validation.json", "utf-8")
//   );

//   for (const [name, { schema, instance, errors }] of Object.entries(
//     testCases
//   )) {
//     it(name, () => {
//       expect(isSchema(schema)).toBe(true);
//       // if (isSchema(schema)) {
//       //   expect(validate(schema, instance)).toEqual(errors);
//       // }
//     });
//   }
// });
