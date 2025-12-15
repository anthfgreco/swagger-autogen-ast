import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("recursive-schemas", () => {
  test("handles recursive interface definitions", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    const route = spec.paths["/comments"].post;
    expect(route).toBeDefined();

    let schema = route.requestBody.content["application/json"].schema;

    // Should be a ref to Comment
    expect(schema.$ref).toBeDefined();
    const refName = schema.$ref.split("/").pop();
    expect(refName).toBe("Comment");

    const commentSchema = spec.components.schemas["Comment"];
    expect(commentSchema).toBeDefined();
    expect(commentSchema.properties.replies.type).toBe("array");

    // The items of replies should ref back to Comment
    expect(commentSchema.properties.replies.items.$ref).toBe(
      "#/components/schemas/Comment",
    );
  });
});
