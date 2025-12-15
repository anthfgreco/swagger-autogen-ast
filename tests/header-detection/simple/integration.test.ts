import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("header-detection simple", () => {
  test("detects x-api-key header parameter", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/header-simple"].get;
    expect(route).toBeDefined();

    const headerParam = (route.parameters || []).find(
      (p: any) => p.in === "header" && p.name.toLowerCase() === "x-api-key",
    );

    expect(headerParam).toBeDefined();
  });
});
