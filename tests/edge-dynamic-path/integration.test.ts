import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("edge-dynamic-path", () => {
  test("edge dynamic path is handled correctly", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    // expect(spec.paths["/unknown-dynamic-path"]).toBeDefined();
    expect(spec.paths["/{id}"]).toBeDefined();
  });
});
