import moment from "moment";

export type Schema =
  | SchemaFormEmpty
  | SchemaFormRef
  | SchemaFormType
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
  [false, false, false, false, false, false, false, false, true, true]
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
  "timestamp"
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
    mapping !== undefined
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

    if (!enum_.every(elem => typeof elem === "string")) {
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

interface ValidationConfig {
  maxDepth: number;
  maxErrors: number;
}

export class MaxDepthExceededError extends Error {}

class MaxErrorsReachedError extends Error {}

export interface ValidationError {
  instancePath: string[];
  schemaPath: string[];
}

export function validate(
  schema: Schema,
  instance: unknown,
  config?: ValidationConfig
): ValidationError[] {
  const state = {
    errors: [],
    instanceTokens: [],
    schemaTokens: [[]],
    root: schema,
    config: config || { maxDepth: 0, maxErrors: 0 }
  };

  try {
    validateWithState(state, schema, instance);
  } catch (err) {
    if (err instanceof MaxErrorsReachedError) {
      // MaxErrorsReachedError is just a dummy error to abort further
      // validation. The contents of state.errors are what we need to return.
    } else {
      // This is a genuine error. Let's re-throw it.
      throw err;
    }
  }

  return state.errors;
}

interface ValidationState {
  errors: ValidationError[];
  instanceTokens: string[];
  schemaTokens: string[][];
  root: Schema;
  config: ValidationConfig;
}

function validateWithState(
  state: ValidationState,
  schema: Schema,
  instance: unknown,
  parentTag?: string
) {
  if (schema.nullable && instance === null) {
    return;
  }

  if (isRefForm(schema)) {
    if (state.schemaTokens.length === state.config.maxDepth) {
      throw new MaxDepthExceededError();
    }

    // The ref form is the only case where we push a new array onto
    // schemaTokens; we maintain a separate stack for each reference.
    state.schemaTokens.push(["definitions", schema.ref]);
    validateWithState(state, state.root.definitions![schema.ref], instance);
    state.schemaTokens.pop();
  } else if (isTypeForm(schema)) {
    pushSchemaToken(state, "type");

    switch (schema.type) {
      case "boolean":
        if (typeof instance !== "boolean") {
          pushError(state);
        }
        break;
      case "float32":
      case "float64":
        if (typeof instance !== "number") {
          pushError(state);
        }
        break;
      case "int8":
        validateInt(state, instance, -128, 127);
        break;
      case "uint8":
        validateInt(state, instance, 0, 255);
        break;
      case "int16":
        validateInt(state, instance, -32768, 32767);
        break;
      case "uint16":
        validateInt(state, instance, 0, 65535);
        break;
      case "int32":
        validateInt(state, instance, -2147483648, 2147483647);
        break;
      case "uint32":
        validateInt(state, instance, 0, 4294967295);
        break;
      case "string":
        if (typeof instance !== "string") {
          pushError(state);
        }
        break;
      case "timestamp":
        if (typeof instance !== "string") {
          pushError(state);
        } else {
          // ISO 8601 is unfortunately not quite the same thing as RFC 3339.
          // However, at the time of writing no adequate alternative,
          // widely-used library for parsing RFC3339 timestamps exists.
          //
          // Notably, moment does not support two of the examples given in
          // RFC 3339 with "60" in the seconds place. These timestamps arise
          // due to leap seconds. See:
          //
          // https://tools.ietf.org/html/rfc3339#section-5.8
          if (!moment(instance, moment.ISO_8601).isValid()) {
            pushError(state);
          }
        }
        break;
    }

    popSchemaToken(state);
  } else if (isEnumForm(schema)) {
    pushSchemaToken(state, "enum");

    if (typeof instance !== "string" || !schema.enum.includes(instance)) {
      pushError(state);
    }

    popSchemaToken(state);
  } else if (isElementsForm(schema)) {
    pushSchemaToken(state, "elements");

    if (Array.isArray(instance)) {
      for (const [index, subInstance] of instance.entries()) {
        pushInstanceToken(state, index.toString());
        validateWithState(state, schema.elements, subInstance);
        popInstanceToken(state);
      }
    } else {
      pushError(state);
    }

    popSchemaToken(state);
  } else if (isPropertiesForm(schema)) {
    // JSON has six basic types of data (null, boolean, number, string,
    // array, object). Of their standard JS countparts, three have a
    // `typeof` of "object": null, array, and object.
    //
    // This check attempts to check if something is "really" an object.
    if (
      typeof instance === "object" &&
      instance !== null &&
      !Array.isArray(instance)
    ) {
      if (schema.properties !== undefined) {
        pushSchemaToken(state, "properties");
        for (const [name, subSchema] of Object.entries(schema.properties)) {
          pushSchemaToken(state, name);
          if (instance.hasOwnProperty(name)) {
            pushInstanceToken(state, name);
            validateWithState(state, subSchema, (instance as any)[name]);
            popInstanceToken(state);
          } else {
            pushError(state);
          }
          popSchemaToken(state);
        }
        popSchemaToken(state);
      }

      if (schema.optionalProperties !== undefined) {
        pushSchemaToken(state, "optionalProperties");
        for (const [name, subSchema] of Object.entries(
          schema.optionalProperties
        )) {
          pushSchemaToken(state, name);
          if (instance.hasOwnProperty(name)) {
            pushInstanceToken(state, name);
            validateWithState(state, subSchema, (instance as any)[name]);
            popInstanceToken(state);
          }
          popSchemaToken(state);
        }
        popSchemaToken(state);
      }

      if (schema.additionalProperties !== true) {
        for (const name of Object.keys(instance)) {
          const inRequired = schema.properties && name in schema.properties;
          const inOptional =
            schema.optionalProperties && name in schema.optionalProperties;

          if (!inRequired && !inOptional && name !== parentTag) {
            pushInstanceToken(state, name);
            pushError(state);
            popInstanceToken(state);
          }
        }
      }
    } else {
      if (schema.properties !== undefined) {
        pushSchemaToken(state, "properties");
      } else {
        pushSchemaToken(state, "optionalProperties");
      }

      pushError(state);
      popSchemaToken(state);
    }
  } else if (isValuesForm(schema)) {
    pushSchemaToken(state, "values");

    // See comment in properties form on why this is the test we use for
    // checking for objects.
    if (
      typeof instance === "object" &&
      instance !== null &&
      !Array.isArray(instance)
    ) {
      for (const [name, subInstance] of Object.entries(instance)) {
        pushInstanceToken(state, name);
        validateWithState(state, schema.values, subInstance);
        popInstanceToken(state);
      }
    } else {
      pushError(state);
    }

    popSchemaToken(state);
  } else if (isDiscriminatorForm(schema)) {
    // See comment in properties form on why this is the test we use for
    // checking for objects.
    if (
      typeof instance === "object" &&
      instance !== null &&
      !Array.isArray(instance)
    ) {
      if (instance.hasOwnProperty(schema.discriminator)) {
        const tag = (instance as any)[schema.discriminator];

        if (typeof tag === "string") {
          if (tag in schema.mapping) {
            pushSchemaToken(state, "mapping");
            pushSchemaToken(state, tag);
            validateWithState(
              state,
              schema.mapping[tag],
              instance,
              schema.discriminator
            );
            popSchemaToken(state);
            popSchemaToken(state);
          } else {
            pushSchemaToken(state, "mapping");
            pushInstanceToken(state, schema.discriminator);
            pushError(state);
            popInstanceToken(state);
            popSchemaToken(state);
          }
        } else {
          pushSchemaToken(state, "discriminator");
          pushInstanceToken(state, schema.discriminator);
          pushError(state);
          popInstanceToken(state);
          popSchemaToken(state);
        }
      } else {
        pushSchemaToken(state, "discriminator");
        pushError(state);
        popSchemaToken(state);
      }
    } else {
      pushSchemaToken(state, "discriminator");
      pushError(state);
      popSchemaToken(state);
    }
  }
}

function validateInt(
  state: ValidationState,
  instance: unknown,
  min: number,
  max: number
) {
  if (
    typeof instance !== "number" ||
    !Number.isInteger(instance) ||
    instance < min ||
    instance > max
  ) {
    pushError(state);
  }
}

function pushInstanceToken(state: ValidationState, token: string) {
  state.instanceTokens.push(token);
}

function popInstanceToken(state: ValidationState) {
  state.instanceTokens.pop();
}

function pushSchemaToken(state: ValidationState, token: string) {
  state.schemaTokens[state.schemaTokens.length - 1].push(token);
}

function popSchemaToken(state: ValidationState) {
  state.schemaTokens[state.schemaTokens.length - 1].pop();
}

function pushError(state: ValidationState) {
  state.errors.push({
    instancePath: [...state.instanceTokens],
    schemaPath: [...state.schemaTokens[state.schemaTokens.length - 1]]
  });

  if (state.errors.length === state.config.maxErrors) {
    throw new MaxErrorsReachedError();
  }
}
