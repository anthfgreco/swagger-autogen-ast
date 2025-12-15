import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("primitive-types", () => {
  test("handles void, any, undefined, null", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/primitives"].post;
    let schema = route.requestBody.content["application/json"].schema;
    if (schema.$ref) {
      schema = spec.components.schemas[schema.$ref.split("/").pop()];
    }

    // void -> {}
    expect(schema.properties.nothing).toEqual({});

    // any -> {}
    expect(schema.properties.unknown).toEqual({});

    // undefined -> { type: "string", format: "nullable" }
    expect(schema.properties.missing).toEqual({
      type: "string",
      format: "nullable",
    });

    // null -> { type: "string", format: "nullable" }
    expect(schema.properties.empty).toEqual({
      type: "string",
      format: "nullable",
    });
  });
});
