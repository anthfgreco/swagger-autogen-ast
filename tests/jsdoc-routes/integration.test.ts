import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("jsdoc-routes", () => {
  test("parses JSDoc comments above route definition", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/user/{id}"].get;
    expect(route).toBeDefined();

    expect(route.summary).toBe("Get User");
    expect(route.description).toBe("Fetch a user by their unique ID");
    expect(route.tags).toContain("Users");
    expect(route.tags).toContain("Public");
    expect(route.deprecated).toBe(true);
    expect(route.operationId).toBe("getUserById");
  });
});
