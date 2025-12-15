import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("query-params", () => {
  test("infers query parameters from generic argument", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/users"].get;
    expect(route).toBeDefined();
    expect(route.parameters).toBeDefined();

    const includeProfile = route.parameters.find(
      (p: any) => p.name === "includeProfile",
    );
    expect(includeProfile).toBeDefined();
    expect(includeProfile.in).toBe("query");
    expect(includeProfile.schema.type).toBe("string");

    const sortBy = route.parameters.find((p: any) => p.name === "sortBy");
    expect(sortBy).toBeDefined();
    expect(sortBy.in).toBe("query");
  });
});
