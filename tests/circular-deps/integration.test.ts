import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.ts");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("circular-deps", () => {
  test("handles circular dependencies gracefully", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    // /a/hello
    expect(spec.paths["/a/hello"]).toBeDefined();

    // /a/b/hello
    expect(spec.paths["/a/b/hello"]).toBeDefined();

    // /a/b/a-again/hello should NOT exist if we stop recursion on visited files
    // OR it might exist if the stack check is path-based, but the implementation uses file path stack.
    // "Cyclic dependency check: If we are already processing this file in the current chain, stop."
    // So: index -> a -> b -> a (STOP)

    expect(spec.paths["/a/b/a-again/hello"]).toBeUndefined();
  });
});
