/**
 * Module schema provides code to safely handle JSON Typedef schemas.
 *
 * JSON Typedef schemas are represented in this module with {@link Schema}, and
 * you can check if a JSON object is a correct schema by using {@link isSchema}
 * and {@link isValidSchema}.
 *
 * @packageDocumentation
 */

/**
 * Schema is a TypeScript representation of a correct JSON Typedef schema.
 *
 * The JSON Typedef specification allows schemas to take on one of eight forms.
 * Each of those forms has its own type in this module; Schema is simply a union
 * of each of those eight types.
 */
export type Schema =
  | SchemaFormEmpty
  | SchemaFormRef
  | SchemaFormType
  | SchemaFormEnum
  | SchemaFormElements
  | SchemaFormProperties
  | SchemaFormValues
  | SchemaFormDiscriminator;

/**
 * SchemaFormEmpty represents schemas of the empty form.
 */
export type SchemaFormEmpty = SharedFormProperties;

/**
 * SchemaFormRef represents schemas of the ref form.
 */
export type SchemaFormRef = SharedFormProperties & {
  ref: string;
};

/**
 * SchemaFormType represents schemas of the type form.
 */
export type SchemaFormType = SharedFormProperties & {
  type: Type;
};

/**
 * Type represents the legal values of the "type" keyword in JSON Typedef.
 */
export type Type =
  | "boolean"
  | "float32"
  | "float64"
  | "int8"
  | "uint8"
  | "int16"
  | "uint16"
  | "int32"
  | "uint32"
  | "string"
  | "timestamp";

/**
 * SchemaFormEnum represents schemas of the enum form.
 */
export type SchemaFormEnum = SharedFormProperties & {
  enum: string[];
};

/**
 * SchemaFormElements represents schemas of the elements form.
 */
export type SchemaFormElements = SharedFormProperties & {
  elements: Schema;
};

/**
 * SchemaFormProperties represents schemas of the properties form.
 */
export type SchemaFormProperties = SharedFormProperties &
  (
    | {
        properties?: { [name: string]: Schema };
        optionalProperties: { [name: string]: Schema };
        additionalProperties?: boolean;
      }
    | {
        properties: { [name: string]: Schema };
        optionalProperties?: { [name: string]: Schema };
        additionalProperties?: boolean;
      }
  );

/**
 * SchemaFormValues represents schemas of the values form.
 */
export type SchemaFormValues = SharedFormProperties & {
  values: Schema;
};

/**
 * SchemaFormDiscriminator represents schemas of the discriminator form.
 */
export type SchemaFormDiscriminator = SharedFormProperties & {
  discriminator: string;
  mapping: { [name: string]: Schema };
};

/**
 * SharedFormProperties contains the properties shared among all schema forms.
 */
interface SharedFormProperties {
  definitions?: { [definition: string]: Schema };
  metadata?: { [name: string]: unknown };
  nullable?: boolean;
}

/**
 * isEmptyForm checks whether some Schema is of the empty form.
 *
 * @param schema The schema to validate
 */
export function isEmptyForm(schema: Schema): schema is SchemaFormEmpty {
  const { definitions, nullable, metadata, ...rest } = schema;
  return Object.keys(rest).length === 0;
}

/**
 * isRefForm checks whether some Schema is of the ref form.
 *
 * @param schema The schema to validate
 */
export function isRefForm(schema: Schema): schema is SchemaFormRef {
  return "ref" in schema;
}

/**
 * isTypeForm checks whether some Schema is of the type form.
 *
 * @param schema The schema to validate
 */
export function isTypeForm(schema: Schema): schema is SchemaFormType {
  return "type" in schema;
}

/**
 * isEnumForm checks whether some Schema is of the enum form.
 *
 * @param schema The schema to validate
 */
export function isEnumForm(schema: Schema): schema is SchemaFormEnum {
  return "enum" in schema;
}

/**
 * isElementsForm checks whether some Schema is of the elements form.
 *
 * @param schema The schema to validate
 */
export function isElementsForm(schema: Schema): schema is SchemaFormElements {
  return "elements" in schema;
}

/**
 * isPropertiesForm checks whether some Schema is of the properties form.
 *
 * @param schema The schema to validate
 */
export function isPropertiesForm(
  schema: Schema
): schema is SchemaFormProperties {
  return "properties" in schema || "optionalProperties" in schema;
}

/**
 * isPropertiesForm checks whether some Schema is of the values form.
 *
 * @param schema The schema to validate
 */
export function isValuesForm(schema: Schema): schema is SchemaFormValues {
  return "values" in schema;
}

/**
 * isDiscriminatorForm checks whether some Schema is of the values form.
 *
 * @param schema The schema to validate
 */
export function isDiscriminatorForm(
  schema: Schema
): schema is SchemaFormDiscriminator {
  return "discriminator" in schema;
}

/**
 * isValidSchema checks whether some Schema is correct, according to the syntax
 * rules of JSON Typedef.
 *
 * In particular, isValidSchema verifies that:
 *
 * 1. The schema does not have any non-root definitions,
 * 2. All references point to actually-existing definitions,
 * 3. All enums are non-empty, and do not contain duplicates,
 * 4. The `properties` and `optionalProperties` of a schema never share
 *    properties,
 * 5. All schemas in `mapping` are of the properties form,
 * 6. Schemas in `mapping` never re-specify the `discriminator` property
 *
 * If an object returned from `JSON.parse` passes both {@link isSchema} and
 * {@link isValidSchema}, then it is a correct JSON Typedef schema.
 *
 * @param schema The schema to validate
 * @param root The schema to consider as the "root" schema. If undefined,
 * `schema` will be used as the root. This is usually what you want to do.
 */
export function isValidSchema(schema: Schema, root?: Schema): boolean {
  if (root === undefined) {
    root = schema;
  }

  if (schema.definitions !== undefined) {
    if (root !== schema) {
      return false;
    }

    for (const subSchema of Object.values(schema.definitions)) {
      if (!isValidSchema(subSchema, root)) {
        return false;
      }
    }
  }

  if (isRefForm(schema)) {
    if (!(schema.ref in (root.definitions || {}))) {
      return false;
    }
  }

  if (isEnumForm(schema)) {
    if (schema.enum.length === 0) {
      return false;
    }

    if (schema.enum.length !== new Set(schema.enum).size) {
      return false;
    }
  }

  if (isElementsForm(schema)) {
    return isValidSchema(schema.elements, root);
  }

  if (isPropertiesForm(schema)) {
    for (const subSchema of Object.values(schema.properties || {})) {
      if (!isValidSchema(subSchema, root)) {
        return false;
      }
    }

    for (const subSchema of Object.values(schema.optionalProperties || {})) {
      if (!isValidSchema(subSchema, root)) {
        return false;
      }
    }

    for (const key of Object.keys(schema.properties || {})) {
      if (key in (schema.optionalProperties || {})) {
        return false;
      }
    }
  }

  if (isValuesForm(schema)) {
    return isValidSchema(schema.values, root);
  }

  if (isDiscriminatorForm(schema)) {
    for (const subSchema of Object.values(schema.mapping)) {
      if (!isValidSchema(subSchema, root) || !isPropertiesForm(subSchema)) {
        return false;
      }

      if (subSchema.nullable) {
        return false;
      }

      if (schema.discriminator in (subSchema.properties || {})) {
        return false;
      }

      if (schema.discriminator in (subSchema.optionalProperties || {})) {
        return false;
      }
    }
  }

  return true;
}

// Index of valid form "signatures" -- i.e., combinations of the presence of the
// keywords (in order):
//
// ref type enum elements properties optionalProperties additionalProperties
// values discriminator mapping
//
// The keywords "definitions", "nullable", and "metadata" are not included here,
// because they would restrict nothing.
const VALID_FORMS = [
  // Empty form
  [false, false, false, false, false, false, false, false, false, false],
  // Ref form
  [true, false, false, false, false, false, false, false, false, false],
  // Type form
  [false, true, false, false, false, false, false, false, false, false],
  // Enum form
  [false, false, true, false, false, false, false, false, false, false],
  // Elements form
  [false, false, false, true, false, false, false, false, false, false],
  // Properties form -- properties or optional properties or both, and never
  // additional properties on its own
  [false, false, false, false, true, false, false, false, false, false],
  [false, false, false, false, false, true, false, false, false, false],
  [false, false, false, false, true, true, false, false, false, false],
  [false, false, false, false, true, false, true, false, false, false],
  [false, false, false, false, false, true, true, false, false, false],
  [false, false, false, false, true, true, true, false, false, false],
  // Values form
  [false, false, false, false, false, false, false, true, false, false],
  // Discriminator form
  [false, false, false, false, false, false, false, false, true, true],
];

// List of valid values that the "type" keyboard may take on.
const VALID_TYPES = [
  "boolean",
  "float32",
  "float64",
  "int8",
  "uint8",
  "int16",
  "uint16",
  "int32",
  "uint32",
  "string",
  "timestamp",
];

/**
 * isSchema checks whether some piece of JSON data has the shape of a JSON
 * Typedef Schema.
 *
 * This function only looks at the "shape" of data: it just makes sure all
 * property names and types are valid, and that the data takes on one of the
 * eight JSON Typedef forms.
 *
 * If an object returned from `JSON.parse` passes both {@link isSchema} and
 * {@link isValidSchema}, then it is a correct JSON Typedef schema.
 *
 * @param data The data to check
 */
export function isSchema(data: unknown): data is Schema {
  if (typeof data !== "object" || Array.isArray(data) || data === null) {
    return false;
  }

  // TypeScript does not let us coerce `{}` into `{ [index: string]: unknown }`.
  // At the time of writing, it's unclear why this is the case, nor under what
  // circumstances such an coercion would be wrong.
  //
  // So we work around the compiler here.
  const obj: { [index: string]: unknown } = data as any;

  const {
    definitions = undefined,
    nullable = undefined,
    metadata = undefined,
    ref = undefined,
    type = undefined,
    enum: enum_ = undefined,
    elements = undefined,
    properties = undefined,
    optionalProperties = undefined,
    additionalProperties = undefined,
    values = undefined,
    discriminator = undefined,
    mapping = undefined,
    ...rest
  } = obj;

  const formSignature = [
    ref !== undefined,
    type !== undefined,
    enum_ !== undefined,
    elements !== undefined,
    properties !== undefined,
    optionalProperties !== undefined,
    additionalProperties !== undefined,
    values !== undefined,
    discriminator !== undefined,
    mapping !== undefined,
  ];

  let formOk = false;
  for (const validForm of VALID_FORMS) {
    formOk =
      formOk ||
      validForm.every((value, index) => value === formSignature[index]);
  }

  if (!formOk) {
    return false;
  }

  if (definitions !== undefined) {
    if (
      typeof definitions !== "object" ||
      Array.isArray(definitions) ||
      definitions === null
    ) {
      return false;
    }

    for (const value of Object.values(definitions)) {
      if (!isSchema(value)) {
        return false;
      }
    }
  }

  if (nullable !== undefined) {
    if (typeof nullable !== "boolean") {
      return false;
    }
  }

  if (metadata !== undefined) {
    if (
      typeof metadata !== "object" ||
      Array.isArray(metadata) ||
      metadata === null
    ) {
      return false;
    }
  }

  if (ref !== undefined) {
    if (typeof ref !== "string") {
      return false;
    }
  }

  if (type !== undefined) {
    if (typeof type !== "string" || !VALID_TYPES.includes(type)) {
      return false;
    }
  }

  if (enum_ !== undefined) {
    if (!Array.isArray(enum_)) {
      return false;
    }

    if (!enum_.every((elem) => typeof elem === "string")) {
      return false;
    }
  }

  if (elements !== undefined) {
    if (!isSchema(elements)) {
      return false;
    }
  }

  if (properties !== undefined) {
    if (
      typeof properties !== "object" ||
      Array.isArray(properties) ||
      properties === null
    ) {
      return false;
    }

    for (const value of Object.values(properties)) {
      if (!isSchema(value)) {
        return false;
      }
    }
  }

  if (optionalProperties !== undefined) {
    if (
      typeof optionalProperties !== "object" ||
      Array.isArray(optionalProperties) ||
      optionalProperties === null
    ) {
      return false;
    }

    for (const value of Object.values(optionalProperties)) {
      if (!isSchema(value)) {
        return false;
      }
    }
  }

  if (additionalProperties !== undefined) {
    if (typeof additionalProperties !== "boolean") {
      return false;
    }
  }

  if (values !== undefined) {
    if (!isSchema(values)) {
      return false;
    }
  }

  if (discriminator !== undefined) {
    if (typeof discriminator !== "string") {
      return false;
    }
  }

  if (mapping !== undefined) {
    if (
      typeof mapping !== "object" ||
      Array.isArray(mapping) ||
      mapping === null
    ) {
      return false;
    }

    for (const value of Object.values(mapping)) {
      if (!isSchema(value)) {
        return false;
      }
    }
  }

  if (Object.keys(rest).length !== 0) {
    return false;
  }

  return true;
}
