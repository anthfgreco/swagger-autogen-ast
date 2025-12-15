import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("union-types", () => {
  test("handles simple and object unions", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    // Simple Union
    const unionRoute = spec.paths["/union"].post;
    let unionSchema = unionRoute.requestBody.content["application/json"].schema;
    if (unionSchema.$ref) {
      unionSchema = spec.components.schemas[unionSchema.$ref.split("/").pop()];
    }

    const valueProp = unionSchema.properties.value;
    expect(valueProp.anyOf).toBeDefined();
    expect(valueProp.anyOf).toHaveLength(2);
    // One should be string, one number
    const types = valueProp.anyOf.map((s: any) => s.type);
    expect(types).toContain("string");
    expect(types).toContain("number");

    // Object Union
    const objRoute = spec.paths["/object-union"].post;
    let objSchema = objRoute.requestBody.content["application/json"].schema;
    if (objSchema.$ref) {
      objSchema = spec.components.schemas[objSchema.$ref.split("/").pop()];
    }

    const itemProp = objSchema.properties.item;
    expect(itemProp.anyOf).toBeDefined();
    expect(itemProp.anyOf).toHaveLength(2);
  });
});
