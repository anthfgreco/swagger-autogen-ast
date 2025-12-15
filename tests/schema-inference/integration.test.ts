import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("schema-inference", () => {
  test("infers complex schemas correctly", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    // Check User schema
    const userPath = spec.paths["/user"];
    expect(userPath).toBeDefined();
    let userSchema =
      userPath.post.requestBody.content["application/json"].schema;

    if (userSchema.$ref) {
      const refName = userSchema.$ref.split("/").pop();
      userSchema = spec.components.schemas[refName];
    }

    expect(userSchema.properties.id.type).toBe("number");
    expect(userSchema.properties.name.type).toBe("string");
    expect(userSchema.properties.role.enum).toEqual(["admin", "user"]);
    expect(userSchema.properties.tags.type).toBe("array");
    expect(userSchema.properties.tags.items.type).toBe("string");
    expect(userSchema.properties.metadata.type).toBe("object");
    expect(userSchema.properties.metadata.properties.lastLogin.type).toBe(
      "string",
    );

    // Check AdminUser schema (Intersection)
    const adminPath = spec.paths["/admin"];
    expect(adminPath).toBeDefined();
    const adminSchema =
      adminPath.post.requestBody.content["application/json"].schema;

    // Intersection types often result in 'allOf'
    expect(adminSchema.allOf).toBeDefined();
  });
});
