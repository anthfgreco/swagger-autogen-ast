import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("response-empty-array-literal-skip", () => {
  test("should skip untyped empty array literal and use typed array for schema", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/users"].get;
    expect(route).toBeDefined();

    expect(route.responses["200"]).toBeDefined();

    const resp200 = route.responses["200"] as any;
    expect(resp200.content).toBeDefined();
    expect(resp200.content["application/json"]).toBeDefined();

    const schema = resp200.content["application/json"].schema;
    expect(schema.type).toBe("array");
    expect(schema.items).toBeDefined();

    // Verify it picked up the IUser properties, not just "string" or "object" or "nullable"
    // If it picked up the empty array `[]`, it might result in `items: {}` or `items: { type: "string", nullable: true }` depending on the implementation.
    // We want to ensure it has the properties of IUser.

    if (schema.items.$ref) {
      const refName = schema.items.$ref.split("/").pop();
      const def = spec.components.schemas[refName];
      expect(def).toBeDefined();
      expect(def.properties).toHaveProperty("id");
      expect(def.properties).toHaveProperty("name");
      expect(def.properties).toHaveProperty("email");
    } else {
      expect(schema.items.properties).toHaveProperty("id");
      expect(schema.items.properties).toHaveProperty("name");
      expect(schema.items.properties).toHaveProperty("email");
    }
  });
});
