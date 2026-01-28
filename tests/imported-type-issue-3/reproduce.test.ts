import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { generateSpec } from "../utils";

describe("Imported Type Issue 3 (Monorepo Mock with Bundler Resolution)", () => {
  it("should resolve schema for IApiClientTokenRequest when using moduleResolution: Bundler", () => {
    const cwd = path.resolve(__dirname);
    const entryFile = path.join(cwd, "packages", "backend", "src", "index.ts");
    const tsconfigPath = path.join(cwd, "packages", "backend", "tsconfig.json");
    const outputFile = path.join(cwd, "swagger-output.json");

    if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

    const spec = generateSpec(entryFile, outputFile, {
      tsconfigPath: tsconfigPath,
    });

    // Check /auth/token (POST) - IApiClientTokenRequest in body cast
    const tokenPath = spec.paths["/auth/token"];
    expect(tokenPath).toBeDefined();
    expect(tokenPath.post).toBeDefined();

    const requestBody = tokenPath.post.requestBody;
    expect(requestBody).toBeDefined();

    const content = requestBody.content["application/json"];
    expect(content).toBeDefined();

    const schema = content.schema;
    expect(schema).toBeDefined();

    // Verify the schema resolves correctly
    if ("$ref" in schema) {
      const refName = schema.$ref.split("/").pop();
      const def = spec.components.schemas[refName];
      expect(def).toBeDefined();
      expect(def.properties).toBeDefined();
      expect(def.properties.clientId).toBeDefined();
      expect(def.properties.clientId.type).toBe("string");
      expect(def.properties.clientSecret).toBeDefined();
      expect(def.properties.clientSecret.type).toBe("string");
      // Verify JSDoc descriptions are preserved
      expect(def.properties.clientId.description).toBe(
        "The client ID issued to the partner.",
      );
      expect(def.properties.clientSecret.description).toBe(
        "The secret key issued to the partner.",
      );
    } else {
      // Direct inline object - still should have properties
      expect(schema.type).toBe("object");
      expect(schema.properties).toBeDefined();
      expect(schema.properties.clientId).toBeDefined();
      expect(schema.properties.clientSecret).toBeDefined();
    }

    // Check response body for /auth/token - IApiClientTokenResponse
    const response200Token = tokenPath.post.responses["200"];
    expect(response200Token).toBeDefined();
    const tokenResponseSchema =
      response200Token.content["application/json"].schema;

    if ("$ref" in tokenResponseSchema) {
      const tokenResRefName = tokenResponseSchema.$ref.split("/").pop();
      const tokenResDef = spec.components.schemas[tokenResRefName];
      expect(tokenResDef).toBeDefined();
      expect(tokenResDef.properties.accessToken).toBeDefined();
      expect(tokenResDef.properties.tokenType).toBeDefined();
      expect(tokenResDef.properties.expiresIn).toBeDefined();
    }

    // Check /user (GET) - IUser response
    const userPath = spec.paths["/user"];
    expect(userPath).toBeDefined();
    expect(userPath.get).toBeDefined();

    const userResponse200 = userPath.get.responses["200"];
    expect(userResponse200).toBeDefined();
    const userResponseSchema =
      userResponse200.content["application/json"].schema;

    if ("$ref" in userResponseSchema) {
      const userRefName = userResponseSchema.$ref.split("/").pop();
      const userDef = spec.components.schemas[userRefName];
      expect(userDef).toBeDefined();
      expect(userDef.properties.id).toBeDefined();
      expect(userDef.properties.firstName).toBeDefined();
      expect(userDef.properties.mainParentClinicId).toBeDefined();
    }
  });
});
