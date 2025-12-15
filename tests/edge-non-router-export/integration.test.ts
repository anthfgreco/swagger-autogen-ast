import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("edge-non-router-export", () => {
  test("helper exports with swagger comments are ignored", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/ok"].post;
    expect(route).toBeDefined();
    // Ensure NotARoute tag not applied
    expect(route.tags).not.toContain("NotARoute");
  });
});
