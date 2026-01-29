import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("response-schema-merging", () => {
  const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

  test("should merge different schemas into oneOf", () => {
    const route = spec.paths["/pet"].get;
    const schema = route.responses["200"].content["application/json"].schema;

    expect(schema).toBeDefined();
    expect(schema.oneOf).toBeDefined();
    expect(schema.oneOf).toHaveLength(2);

    // Check that we have both IDog and ICat refs (or inline props matching them)
    // Since we export the interfaces, likely they become refs or inline objects.
    // Based on typical behavior, if they are interfaces, they might be refs or inline.
    // We'll check casually to accommodate varying implementation details.

    const hasDog = schema.oneOf.some(
      (s: any) =>
        (s.$ref && s.$ref.endsWith("IDog")) ||
        (s.properties && s.properties.breed),
    );
    const hasCat = schema.oneOf.some(
      (s: any) =>
        (s.$ref && s.$ref.endsWith("ICat")) ||
        (s.properties && s.properties.lives),
    );

    expect(hasDog).toBe(true);
    expect(hasCat).toBe(true);
  });

  test("should deduplicate identical schemas", () => {
    const route = spec.paths["/dogs"].get;
    const schema = route.responses["200"].content["application/json"].schema;

    expect(schema).toBeDefined();
    // Should NOT be oneOf
    expect(schema.oneOf).toBeUndefined();

    // Should be just IDog
    if (schema.$ref) {
      expect(schema.$ref).toContain("IDog");
    } else {
      expect(schema.properties).toHaveProperty("breed");
    }
  });

  test("should ignore empty array schema when merging with typed schema (Typed First order)", () => {
    const route = spec.paths["/mixed"].get;
    const schema = route.responses["200"].content["application/json"].schema;

    expect(schema).toBeDefined();
    // Should NOT be oneOf (the empty array should be skipped)
    expect(schema.oneOf).toBeUndefined();

    // Should be IDog
    if (schema.$ref) {
      expect(schema.$ref).toContain("IDog");
    } else {
      expect(schema.properties).toHaveProperty("breed");
    }
  });
});
