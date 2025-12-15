import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("middleware-external auth", () => {
  test("detects Authorization header and middleware responses (401,200)", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/external-auth"].get;
    expect(route).toBeDefined();

    const params = route.parameters || [];
    const auth = params.find(
      (p: any) => p.in === "header" && p.name.toLowerCase() === "authorization",
    );
    expect(auth).toBeDefined();

    expect(route.responses["401"]).toBeDefined();
    expect(route.responses["200"] || route.responses["201"]).toBeDefined();
  });
});
