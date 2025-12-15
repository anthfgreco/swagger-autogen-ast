import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("programmatic-security simple", () => {
  test("applies programmatic security and securitySchemes", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE, {
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer" },
        },
      },
      security: [{ bearerAuth: [] }],
    });

    expect(spec.components).toBeDefined();
    expect(spec.components.securitySchemes).toBeDefined();
    expect(spec.components.securitySchemes.bearerAuth).toBeDefined();

    expect(spec.security).toBeDefined();
    expect(Array.isArray(spec.security)).toBeTruthy();
    expect(
      spec.security.some((s: any) => s.bearerAuth !== undefined),
    ).toBeTruthy();
  });
});
