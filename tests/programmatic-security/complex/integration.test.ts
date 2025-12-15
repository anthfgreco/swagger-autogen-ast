import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("programmatic-security complex", () => {
  test("merges programmatic and middleware-declared security requirements and schemes", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE, {
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer" },
          apiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key" },
        },
      },
      security: [{ bearerAuth: [] }],
    });

    // root-level schemes
    expect(spec.components).toBeDefined();
    expect(spec.components.securitySchemes).toBeDefined();
    expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
    expect(spec.components.securitySchemes.apiKeyAuth).toBeDefined();

    // programmatic security is applied at root; middleware declares apiKeyAuth
    expect(spec.security).toBeDefined();
    expect(Array.isArray(spec.security)).toBeTruthy();
    expect(
      spec.security.some((s: any) => s.bearerAuth !== undefined),
    ).toBeTruthy();

    const route = spec.paths["/prog-secure-ext"].get;
    expect(route).toBeDefined();
    const opSec = route.security || [];
    const opKeys = opSec.flatMap((s: any) => Object.keys(s));
    expect(opKeys).toContain("apiKeyAuth");
  });
});
