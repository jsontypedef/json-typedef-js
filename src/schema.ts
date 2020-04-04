export type Schema =
  | SchemaFormEmpty
  | SchemaFormRef
  | SchemaFormType
  | SchemaFormEnum
  | SchemaFormElements
  | SchemaFormProperties
  | SchemaFormValues
  | SchemaFormDiscriminator;

export type SchemaFormEmpty = SharedFormProperties;

export type SchemaFormRef = SharedFormProperties & {
  ref: string;
};

export type SchemaFormType = SharedFormProperties & {
  type: Type;
};

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

export type SchemaFormEnum = SharedFormProperties & {
  enum: string[];
};

export type SchemaFormElements = SharedFormProperties & {
  elements: Schema;
};

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

export type SchemaFormValues = SharedFormProperties & {
  values: Schema;
};

export type SchemaFormDiscriminator = SharedFormProperties & {
  discriminator: string;
  mapping: { [name: string]: Schema };
};

interface SharedFormProperties {
  definitions?: { [definition: string]: Schema };
  metadata?: { [name: string]: unknown };
  nullable?: boolean;
}

export function isEmptyForm(schema: Schema): schema is SchemaFormEmpty {
  const { definitions, nullable, metadata, ...rest } = schema;
  return Object.keys(rest).length === 0;
}

export function isRefForm(schema: Schema): schema is SchemaFormRef {
  return "ref" in schema;
}

export function isTypeForm(schema: Schema): schema is SchemaFormType {
  return "type" in schema;
}

export function isEnumForm(schema: Schema): schema is SchemaFormEnum {
  return "enum" in schema;
}

export function isElementsForm(schema: Schema): schema is SchemaFormElements {
  return "elements" in schema;
}

export function isPropertiesForm(
  schema: Schema
): schema is SchemaFormProperties {
  return "properties" in schema || "optionalProperties" in schema;
}

export function isValuesForm(schema: Schema): schema is SchemaFormValues {
  return "values" in schema;
}

export function isDiscriminatorForm(
  schema: Schema
): schema is SchemaFormDiscriminator {
  return "discriminator" in schema;
}

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
