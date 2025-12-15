import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "tags-in-function.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("tag-test integration", () => {
  test("generates openapi output from tags-in-function.ts", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    expect(spec.openapi).toBe("3.0.0");
    expect(spec.info.title).toBe("Test API");
    expect(spec.paths).toBeDefined();

    // From tags-in-function.ts
    const tsRoute = spec.paths["/share-document"];
    expect(tsRoute).toBeDefined();

    // Verify jsdoc tags and description parsing
    expect(tsRoute.post.tags).toContain("Tag Handler Endpoint");
    expect(tsRoute.post.description).toBe("Endpoint to share a document.");

    // Verify request body inference from TypeScript interfaces
    const requestBody = tsRoute.post.requestBody;
    expect(requestBody).toBeDefined();

    const schema = requestBody.content["application/json"].schema;
    expect(schema.properties).toHaveProperty("documentId");
    expect(schema.properties).toHaveProperty("userId");
  });
});
