import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("cross-file-handler", () => {
  test("follows imports to handlers and reads JSDoc/#swagger and assertions", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/create"].post;
    expect(route).toBeDefined();

    // JSDoc from controller should be applied
    expect(route.summary).toBe("Cross File Handler");
    expect(route.tags).toContain("CrossFile");
    // Inline #swagger should also have been parsed
    expect(route.tags).toContain("CrossFileSwagger");

    // Request body should have username/email inferred from the as assertion
    const reqBody = route.requestBody;
    expect(reqBody).toBeDefined();
    let schema = reqBody.content["application/json"].schema;
    if (schema.$ref) {
      const refName = schema.$ref.split("/").pop();
      schema = spec.components.schemas[refName];
    }
    expect(schema.properties).toHaveProperty("username");
    expect(schema.properties).toHaveProperty("email");
  });
});
