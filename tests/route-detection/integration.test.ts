import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("route-detection", () => {
  test("detects nested routes and path parameters", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    // Check direct route
    expect(spec.paths["/health"]).toBeDefined();

    // Check nested route with path param conversion
    // /api/v1 + /:id -> /api/v1/{id}
    expect(spec.paths["/api/v1/{id}"]).toBeDefined();
    expect(spec.paths["/api/v1/{id}"].get).toBeDefined();

    // Check path parameter definition
    const pathParam = spec.paths["/api/v1/{id}"].get.parameters.find(
      (p: any) => p.name === "id" && p.in === "path",
    );
    expect(pathParam).toBeDefined();
    expect(pathParam.required).toBe(true);

    // Check nested route
    expect(spec.paths["/api/v1/update"]).toBeDefined();
    expect(spec.paths["/api/v1/update"].put).toBeDefined();
  });
});
