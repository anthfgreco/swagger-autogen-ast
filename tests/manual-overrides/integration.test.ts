import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("manual-overrides", () => {
  test("applies #swagger inline comments", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/upload"].post;
    expect(route).toBeDefined();

    expect(route.tags).toContain("File Operations");
    expect(route.summary).toBe("Upload a file");
    expect(route.description).toBe("Accepts multipart/form-data.");
    expect(route.deprecated).toBe(true);
    expect(route.operationId).toBe("uploadFileHandler");

    // Check deep value override
    expect(route.responses["201"]).toBeDefined();
    expect(route.responses["201"].description).toBe("File Created");
  });
});
