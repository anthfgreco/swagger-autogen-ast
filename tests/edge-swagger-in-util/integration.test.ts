import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("edge-swagger-in-util", () => {
  test("#swagger tags in util function do not apply to routes", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/util-route"].get;
    expect(route).toBeDefined();

    // The tag from the helper must NOT be applied to the route
    expect(route.tags).not.toContain("ShouldNotApply");
  });
});
