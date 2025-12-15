import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateOpenApi } from "../../src/index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.js");

function generateSpec(filename: string) {
  const outputFile = path.resolve(__dirname, filename);

  generateOpenApi({
    entryFile: ENTRY_FILE,
    outputFile: outputFile,
    info: {
      title: "Test API",
      version: "1.0.0",
    },
  });

  if (!fs.existsSync(outputFile)) {
    throw new Error(`Output file ${outputFile} not created.`);
  }

  const content = fs.readFileSync(outputFile, "utf8");
  return JSON.parse(content);
}

describe("test-repo integration", () => {
  test("generates openapi 3.0.0 output crawling from index.js", () => {
    const spec = generateSpec("openapi-output.json");

    expect(spec.openapi).toBe("3.0.0");
    expect(spec.info.title).toBe("Test API");
    expect(spec.paths).toBeDefined();

    // From a.js
    expect(spec.paths["/hello-from-a"]).toBeDefined();

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
