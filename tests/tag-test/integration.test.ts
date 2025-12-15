import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("tag-test integration", () => {
  test("generates openapi output from tags-in-function.ts", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    expect(spec.openapi).toBe("3.0.0");
    expect(spec.info.title).toBe("Test API");
    expect(spec.paths).toBeDefined();

    // From tags-in-function.ts
    const tagsInFunction = spec.paths["/share-document"];
    expect(tagsInFunction).toBeDefined();

    // Metadata/swagger tags
    expect(tagsInFunction.post.tags).toContain("Tag Handler Endpoint");
    expect(tagsInFunction.post.description).toBe(
      "Endpoint to share a document.",
    );

    // Request body inference from TypeScript interfaces
    const requestBody = tagsInFunction.post.requestBody;
    expect(requestBody).toBeDefined();

    // Schema properties and types
    const schema = requestBody.content["application/json"].schema;
    expect(schema.properties).toHaveProperty("documentId");
    expect(schema.properties).toHaveProperty("userId");
    expect(schema.properties.documentId.type).toBe("string");
    expect(schema.properties.userId.type).toBe("string");

    const inlineShareDocument = spec.paths["/inline-share-document"];
    expect(inlineShareDocument).toBeDefined();
    expect(inlineShareDocument.post.tags).toContain(
      "Inline Tag Handler Endpoint",
    );
    expect(inlineShareDocument.post.description).toBe(
      "Inline endpoint to share a document.",
    );
    const inlineRequestBody = inlineShareDocument.post.requestBody;
    expect(inlineRequestBody).toBeDefined();
    const inlineSchema = inlineRequestBody.content["application/json"].schema;
    expect(inlineSchema.properties).toHaveProperty("documentId");
    expect(inlineSchema.properties).toHaveProperty("userId");
    expect(inlineSchema.properties.documentId.type).toBe("string");
    expect(inlineSchema.properties.userId.type).toBe("string");

    // not-in-index.ts should not be included
    const notInIndex = spec.paths["/not-in-index"];
    expect(notInIndex).toBeUndefined();
  });
});
