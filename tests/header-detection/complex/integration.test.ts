import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("header-detection complex", () => {
  test("detects Authorization and x-correlation-id headers", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/header-complex"].get;
    expect(route).toBeDefined();

    const params = route.parameters || [];
    const auth = params.find(
      (p: any) => p.in === "header" && p.name.toLowerCase() === "authorization",
    );
    const corr = params.find(
      (p: any) =>
        p.in === "header" && p.name.toLowerCase() === "x-correlation-id",
    );

    expect(auth).toBeDefined();
    expect(corr).toBeDefined();
  });
});
