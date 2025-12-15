import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("security-config simple", () => {
  test("applies inline security requirement to operation", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/secure-simple"].get;
    expect(route).toBeDefined();

    expect(route.security).toBeDefined();
    expect(Array.isArray(route.security)).toBeTruthy();
    expect(
      route.security.some((s: any) => s.bearerAuth !== undefined),
    ).toBeTruthy();
  });
});
