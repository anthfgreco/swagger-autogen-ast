import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("generic-wrappers", () => {
  test("infers schema from generic interfaces", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/user"].post;
    expect(route).toBeDefined();

    const schema = route.requestBody.content["application/json"].schema;

    const refName = schema.$ref.split("/").pop();
    const def = spec.components.schemas[refName];
    expect(def).toBeDefined();
  });
});
