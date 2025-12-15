import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("nested-routers", () => {
  test("crawls deeply nested routers across multiple files", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    // /api/v1/users/
    expect(spec.paths["/api/v1/users/"]).toBeDefined();

    // /api/v1/users/{id}
    expect(spec.paths["/api/v1/users/{id}"]).toBeDefined();

    const idParam = spec.paths["/api/v1/users/{id}"].get.parameters.find(
      (p: any) => p.name === "id",
    );
    expect(idParam).toBeDefined();
  });
});
