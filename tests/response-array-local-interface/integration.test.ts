import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("response-array-local-interface", () => {
  test("should correctly infer array of local interface in response", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/appointments"].get;
    expect(route).toBeDefined();

    // 200 response must exist
    expect(route.responses["200"]).toBeDefined();

    const resp200 = route.responses["200"] as any;
    expect(resp200.content).toBeDefined();
    expect(resp200.content["application/json"]).toBeDefined();

    const schema = resp200.content["application/json"].schema;
    expect(schema.type).toBe("array");
    expect(schema.items).toBeDefined();

    // Check if it's a ref or inline object
    if (schema.items.$ref) {
      const refName = schema.items.$ref.split("/").pop();
      const def = spec.components.schemas[refName];
      expect(def).toBeDefined();
      expect(def.properties).toHaveProperty("id");
      expect(def.properties).toHaveProperty("patientId");
      expect(def.properties).toHaveProperty("serviceName");
    } else {
      expect(schema.items.properties).toHaveProperty("id");
      expect(schema.items.properties).toHaveProperty("patientId");
      expect(schema.items.properties).toHaveProperty("serviceName");
    }
  });
});
