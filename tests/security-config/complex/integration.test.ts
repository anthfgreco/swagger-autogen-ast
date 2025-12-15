import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("security-config complex", () => {
  test("applies multiple inline security requirements and detects Authorization header", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/secure-complex"].post;
    expect(route).toBeDefined();

    expect(route.security).toBeDefined();
    expect(Array.isArray(route.security)).toBeTruthy();
    // should include both bearerAuth and apiKeyAuth entries
    const keys = route.security.flatMap((s: any) => Object.keys(s));
    expect(keys).toContain("bearerAuth");
    expect(keys).toContain("apiKeyAuth");

    // also should detect Authorization header usage
    const params = route.parameters || [];
    const auth = params.find(
      (p: any) => p.in === "header" && p.name.toLowerCase() === "authorization",
    );
    expect(auth).toBeDefined();
  });
});
