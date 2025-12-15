import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.js");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("js-test integration", () => {
  test("generates openapi 3.0.0 output crawling from index.js", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    expect(spec.openapi).toBe("3.0.0");
    expect(spec.info.title).toBe("Test API");
    expect(spec.paths).toBeDefined();

    // From a.js
    expect(spec.paths["/hello-from-a"]).toBeDefined();
  });
});
