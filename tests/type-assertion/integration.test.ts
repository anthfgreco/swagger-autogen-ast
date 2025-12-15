import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("type-assertion", () => {
  test("infers request body from type assertion", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/users/{id}"].put;
    expect(route).toBeDefined();

    const requestBody = route.requestBody;
    expect(requestBody).toBeDefined();

    let schema = requestBody.content["application/json"].schema;

    // Resolve refs
    if (schema.$ref) {
      const refName = schema.$ref.split("/").pop();
      schema = spec.components.schemas[refName];
    }

    expect(schema.properties).toHaveProperty("username");
    expect(schema.properties).toHaveProperty("email");
    expect(schema.properties.username.type).toBe("string");
  });
});
