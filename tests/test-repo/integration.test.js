import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import swaggerAutogen from "../../swagger-autogen.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Shared configuration
const ENTRY_FILE = path.join(__dirname, "index.js");
const ENDPOINTS_FILES = ["./index.js"];

/**
 * Helper to run swagger-autogen, parse the result, and cleanup.
 * @param {string} filename - The output filename
 * @param {object|null} config - Optional config object for the library
 * @returns {Promise<object>} The parsed Swagger JSON
 */
async function generateSpec(filename, config = null) {
  const outputFile = path.resolve(__dirname, filename);
  const originalArgv = [...process.argv];

  try {
    // Mock process.argv[1] so the library derives the correct basePath
    process.argv[1] = ENTRY_FILE;

    // Run the library
    if (config) {
      await swaggerAutogen(config)(outputFile, ENDPOINTS_FILES);
    } else {
      await swaggerAutogen(outputFile, ENDPOINTS_FILES);
    }

    // Verify file creation
    if (!fs.existsSync(outputFile)) {
      throw new Error(`Output file ${outputFile} not created.`);
    }

    // Read and parse
    const content = fs.readFileSync(outputFile, "utf8");
    return JSON.parse(content);
  } finally {
    // Restore environment and cleanup file
    process.argv = originalArgv;
    // if (fs.existsSync(outputFile)) {
    //   fs.unlinkSync(outputFile);
    // }
  }
}

describe("test-repo integration", () => {
  test("generates swagger 2.0 output with correct metadata", async () => {
    const spec = await generateSpec("swagger-2-output.json");

    expect(spec.swagger).toBe("2.0");
    expect(spec.paths).toBeDefined();

    // 1. Verify Standard Route (from a.js)
    const routeA = spec.paths["/a/hello-from-a"];
    expect(routeA).toBeDefined();
    expect(routeA.get).toBeDefined();
    // Check if AST successfully parsed the comments
    expect(routeA.get.tags).toEqual(["A Handler Endpoint"]);
    expect(routeA.get.description).toBe("A File Description");

    // 2. Verify Nested/recursive Route (a -> imports b)
    const routeAB = spec.paths["/a/b/hello-from-b"];
    expect(routeAB).toBeDefined();
    expect(routeAB.get).toBeDefined();

    // 3. Verify TypeScript Route
    const routeTag = spec.paths["/tagsInFunction/share-document"];
    expect(routeTag).toBeDefined();
    expect(routeTag.post).toBeDefined();
    // Check TS comment parsing
    expect(routeTag.post.tags).toEqual(["Tag Handler Endpoint"]);
    expect(routeTag.post.description).toBe("Endpoint to share a document.");

    // 4. Verify Automatic Body Generation (from TS definition)
    // In Swagger 2, body is a parameter
    const bodyParam = routeTag.post.parameters.find((p) => p.in === "body");
    expect(bodyParam).toBeDefined();
    expect(bodyParam.name).toBe("body");
    // Should have detected properties from destructuring/usage
    const props = bodyParam.schema.properties;
    expect(props).toHaveProperty("documentId");
    expect(props).toHaveProperty("userId");
  });

  test("generates openapi 3.0.0 output", async () => {
    const spec = await generateSpec("openapi-3-output.json", {
      openapi: "3.0.0",
    });

    expect(spec.openapi).toBe("3.0.0");
    expect(spec.paths).toBeDefined();

    // 1. Verify Basic Route existence
    expect(spec.paths["/b/hello-from-b"]).toBeDefined();

    // 2. Verify TypeScript Route with RequestBody (OpenAPI 3 style)
    const routeTag = spec.paths["/tagsInFunction/share-document"];
    expect(routeTag).toBeDefined();

    // In OpenAPI 3, body is requestBody, not a parameter
    expect(routeTag.post.requestBody).toBeDefined();
    const content = routeTag.post.requestBody.content["application/json"];
    expect(content).toBeDefined();

    const props = content.schema.properties;
    expect(props).toHaveProperty("documentId");
    expect(props).toHaveProperty("userId");

    // 3. Verify Responses (status codes extracted from code)
    const responses = routeTag.post.responses;
    expect(responses["204"]).toBeDefined(); // response.status(204)
    expect(responses["400"]).toBeDefined(); // response.status(400)
  });
});
