import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("status-codes", () => {
  test("detects status codes from res.status and res.sendStatus", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/status-check"].get;
    expect(route).toBeDefined();

    expect(route.responses["200"]).toBeDefined();
    expect(route.responses["200"].description).toBe("OK");

    expect(route.responses["400"]).toBeDefined();
    expect(route.responses["400"].description).toBe("Bad Request");

    expect(route.responses["401"]).toBeDefined();
    expect(route.responses["401"].description).toBe("Unauthorized");

    expect(route.responses["500"]).toBeDefined();
    expect(route.responses["500"].description).toBe("Internal Server Error");
  });
});
