import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("path-const", () => {
  test("resolves string constant route paths", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    // Expect the resolver to produce '/users' (if not implemented, this test will fail)
    expect(spec.paths["/users"]).toBeDefined();
  });
});
