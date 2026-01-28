import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { generateSpec } from "../utils";

describe("Imported Type Issue 2 (Monorepo Mock)", () => {
  it("should resolve schema for IApiClientTokenRequest when used in body cast", () => {
    const cwd = path.resolve(__dirname);
    const entryFile = path.join(cwd, "packages", "backend", "src", "index.ts");
    const tsconfigPath = path.join(cwd, "packages", "backend", "tsconfig.json");
    const outputFile = path.join(cwd, "swagger-output.json");

    if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

    const spec = generateSpec(entryFile, outputFile, {
      tsconfigPath: tsconfigPath,
    });

    // Check /auth/token (POST) - IApiClientTokenRequest
    const tokenPath = spec.paths["/auth/token"];
    expect(tokenPath).toBeDefined();
    expect(tokenPath.post).toBeDefined();

    const requestBody = tokenPath.post.requestBody;
    expect(requestBody).toBeDefined();

    const content = requestBody.content["application/json"];
    expect(content).toBeDefined();

    const schema = content.schema;
    const refName = schema.$ref.split("/").pop();
    const def = spec.components.schemas[refName];

    expect(def).toBeDefined();
    expect(def.properties).toBeDefined();
    expect(def.properties.clientId).toBeDefined();
    expect(def.properties.clientSecret).toBeDefined();

    // Check response body for /auth/token - IApiClientTokenResponse
    const response200Token = tokenPath.post.responses["200"];
    expect(response200Token).toBeDefined();
    const tokenResponseSchema =
      response200Token.content["application/json"].schema;
    const tokenResRefName = tokenResponseSchema.$ref.split("/").pop();
    const tokenResDef = spec.components.schemas[tokenResRefName];
    expect(tokenResDef).toBeDefined();
    expect(tokenResDef.properties.accessToken).toBeDefined();
    expect(tokenResDef.properties.tokenType).toBeDefined();

    // Check /patient (GET) - IPatient
    const patientPath = spec.paths["/patient"];
    expect(patientPath).toBeDefined();
    expect(patientPath.get).toBeDefined();

    const response200 = patientPath.get.responses["200"];
    expect(response200).toBeDefined();
    const responseSchema = response200.content["application/json"].schema;
    const patientRefName = responseSchema.$ref.split("/").pop();
    const patientDef = spec.components.schemas[patientRefName];

    expect(patientDef).toBeDefined();
    expect(patientDef.properties.id).toBeDefined();
    expect(patientDef.properties.firstName).toBeDefined();
    expect(patientDef.properties.clinic).toBeDefined();

    const clinicProp = patientDef.properties.clinic;
    // It might be a reference to 'Clinic' schema or an inline enum
    if ("$ref" in clinicProp) {
      const clinicRefName = clinicProp.$ref.split("/").pop();
      const clinicDef = spec.components.schemas[clinicRefName];
      expect(clinicDef.enum).toContain("CLINICONE");
    } else {
      expect(clinicProp.enum).toContain("CLINICONE");
    }
  });
});
