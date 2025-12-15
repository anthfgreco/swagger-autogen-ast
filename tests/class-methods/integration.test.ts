import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("class-methods", () => {
  test("excludes methods from class schema", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/class"].post;
    let schema = route.requestBody.content["application/json"].schema;
    if (schema.$ref) {
        schema = spec.components.schemas[schema.$ref.split("/").pop()];
    }

    expect(schema.properties).toHaveProperty("name");
    expect(schema.properties).toHaveProperty("age");
    
    // Methods should be excluded
    expect(schema.properties).not.toHaveProperty("getFullName");
    expect(schema.properties).not.toHaveProperty("save");
  });
});
