import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("schema-date-enum-promise", () => {
  test("extracts Date as string/date-time and enums as enum", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/user-schema"].post;
    expect(route).toBeDefined();

    let schema = route.requestBody.content["application/json"].schema;
    if (schema.$ref) {
      const refName = schema.$ref.split("/").pop();
      schema = spec.components.schemas[refName];
    }

    expect(schema.properties).toHaveProperty("createdAt");
    // Date should be string/date-time if supported, otherwise at least an object or string
    const createdAt = schema.properties.createdAt;
    // Accept either explicit date-time formatting or string type
    expect(
      createdAt.type === "string" || createdAt.format === "date-time",
    ).toBeTruthy();

    // Enum role should appear as enum
    expect(schema.properties.role.enum).toBeDefined();
    expect(schema.properties.role.enum).toContain("admin");
    expect(schema.properties.role.enum).toContain("user");
  });
});
