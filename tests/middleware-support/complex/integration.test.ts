import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("middleware-support complex", () => {
  test("collects responses from validation, auth and handler (400, 403, 201)", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/mw-complex"].post;
    expect(route).toBeDefined();

    expect(route.responses["400"]).toBeDefined();
    expect(route.responses["403"]).toBeDefined();
    expect(route.responses["201"]).toBeDefined();
  });
});
