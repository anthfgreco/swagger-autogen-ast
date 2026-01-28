import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { generateSpec } from "../utils";

describe("Imported Type Issue", () => {
  it("should resolve schema for imported interface used in type assertion", () => {
    const cwd = path.resolve(__dirname);
    const entryFile = path.join(cwd, "index.ts");
    const outputFile = path.join(cwd, "swagger-output.json");

    if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

    const spec = generateSpec(entryFile, outputFile);

    const pathItem = spec.paths["/auth/token"];
    expect(pathItem).toBeDefined();
    expect(pathItem.post).toBeDefined();

    const requestBody = pathItem.post.requestBody;
    expect(requestBody).toBeDefined();

    const content = requestBody.content["application/json"];
    expect(content).toBeDefined();

    const schema = content.schema;
    // Expected to be a reference or object with properties
    if ("$ref" in schema) {
      // If it's a ref, we check components
      const refName = schema.$ref.split("/").pop();
      const def = spec.components.schemas[refName];
      expect(def).toBeDefined();
      expect(def.properties).toBeDefined();
      expect(def.properties.clientId).toBeDefined();
      expect(def.properties.clientSecret).toBeDefined();
    } else {
      // Direct object
      expect(schema.type).toBe("object");
      expect(schema.properties).toBeDefined();
      expect(schema.properties.clientId).toBeDefined();
      expect(schema.properties.clientSecret).toBeDefined();
    }
  });
});
