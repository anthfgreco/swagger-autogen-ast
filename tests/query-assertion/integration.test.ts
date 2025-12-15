import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("query-assertion", () => {
  test("detects req.query as MyQuery to generate parameters", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/search"].get;
    expect(route).toBeDefined();

    const qParam = route.parameters.find((p: any) => p.name === "q");
    expect(qParam).toBeDefined();

    const pageParam = route.parameters.find((p: any) => p.name === "page");
    expect(pageParam).toBeDefined();
  });
});
