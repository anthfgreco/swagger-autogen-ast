import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("middleware-external body", () => {
  test("detects middleware 400 and handler 201 responses", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/external-body"].post;
    expect(route).toBeDefined();

    expect(route.responses["400"]).toBeDefined();
    expect(route.responses["201"]).toBeDefined();
  });
});
