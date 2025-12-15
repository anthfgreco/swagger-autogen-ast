import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("middleware-support simple", () => {
  test("includes middleware-inferred status codes (200, 403)", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/mw-simple"].get;
    expect(route).toBeDefined();

    expect(route.responses["200"]).toBeDefined();
    expect(route.responses["403"]).toBeDefined();
  });
});
