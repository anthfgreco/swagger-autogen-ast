import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("tuple-types", () => {
  test("handles tuple types as arrays", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/tuple"].post;
    let schema = route.requestBody.content["application/json"].schema;
    if (schema.$ref) {
        schema = spec.components.schemas[schema.$ref.split("/").pop()];
    }

    // Tuples are usually converted to Arrays in basic OpenAPI 3.0 (3.1 supports prefixItems)
    // The current implementation checks `isArrayType` which includes Tuples.
    // It likely treats them as generic arrays or arrays of the first type if not handled specifically.
    // Let's see what the implementation does:
    // if (this.typeChecker.isTupleType(type)) return true; -> returns { type: 'array', items: ... }
    
    expect(schema.properties.point.type).toBe("array");
    // It might just pick the first type or union of types for items
    // Implementation: const elementType = typeArgs && typeArgs.length > 0 ? typeArgs[0] : null;
    // For [number, number], element type is number.
    expect(schema.properties.point.items.type).toBe("number");
  });
});
