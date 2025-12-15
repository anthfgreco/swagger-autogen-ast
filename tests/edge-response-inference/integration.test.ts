import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("edge-response-inference", () => {
  test("res.json(res) creates a 200 response and (ideally) response schema", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/resp"].get;
    expect(route).toBeDefined();

    // 200 response must exist
    expect(route.responses["200"]).toBeDefined();

    // If response schema inference is implemented, there will be content + schema
    const resp200 = route.responses["200"] as any;
    if (resp200.content && resp200.content["application/json"]) {
      const schema = resp200.content["application/json"].schema;
      if (schema.$ref) {
        const refName = schema.$ref.split("/").pop();
        const def = spec.components.schemas[refName];
        expect(def.properties).toHaveProperty("id");
        expect(def.properties).toHaveProperty("name");
      } else if (schema.properties) {
        expect(schema.properties).toHaveProperty("id");
        expect(schema.properties).toHaveProperty("name");
      }
    }
  });
});
