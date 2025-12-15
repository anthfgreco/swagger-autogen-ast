import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { generateSpec } from "./utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_FILE = path.join(__dirname, "index.js");
const OUTPUT_FILE = path.join(__dirname, "openapi-output.json");

describe("js-test integration", () => {
  test("generates openapi 3.0.0 output crawling from index.js", () => {
    const spec = generateSpec(ENTRY_FILE, OUTPUT_FILE);

    expect(spec.openapi).toBe("3.0.0");
    expect(spec.info.title).toBe("Test API");
    expect(spec.info.version).toBe("1.0.0");
    expect(spec.paths).toBeDefined();

    // Direct Mounts (index.js -> file)
    expect(spec.paths["/a/hello-from-a"]).toBeDefined();
    expect(spec.paths["/c/hello"]).toBeDefined();

    // b.js is visited here directly, even though it was also visited via a.js below.
    expect(spec.paths["/b/hello-from-b"]).toBeDefined();

    // 2. Nested Mounts (index -> a -> b)
    expect(spec.paths["/a/b/hello-from-b"]).toBeDefined();

    // Circular Dependency Handling (index -> b -> a)
    const routeCircular = spec.paths["/b/a/hello-from-a"];
    expect(routeCircular).toBeDefined();
    expect(routeCircular.get.tags).toContain("A Handler Endpoint");

    // Infinite Recursion Prevention
    // The analyzer should stop when it sees 'a.js' a second time in the stack.
    // So index -> a -> b -> a should NOT generate routes.
    expect(spec.paths["/a/b/a/hello-from-a"]).toBeUndefined();
  });
});
