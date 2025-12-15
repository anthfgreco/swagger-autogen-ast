import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("edge-empty-handler", () => {
  test("route with empty handler has no requestBody and default responses", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/no-body"].get;
    expect(route).toBeDefined();
    expect(route.requestBody).toBeUndefined();
    expect(route.responses["200"]).toBeDefined();
  });
});
