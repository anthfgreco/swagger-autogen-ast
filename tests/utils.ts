import fs from "fs";
import { generateOpenApi, GeneratorOptions } from "../src/index";

/** Helper to generate an OpenAPI spec file for tests with default options. */
export function generateSpec(
  entryFile: string,
  outputFile: string,
  options?: Partial<GeneratorOptions>,
) {
  const base: GeneratorOptions = {
    entryFile: entryFile,
    outputFile: outputFile,
    info: {
      title: "Test API",
      version: "1.0.0",
    },
  };

  const config: GeneratorOptions = options ? { ...base, ...options } : base;

  generateOpenApi(config);

  if (!fs.existsSync(outputFile)) {
    throw new Error(`Output file ${outputFile} not created.`);
  }

  const content = fs.readFileSync(outputFile, "utf8");
  return JSON.parse(content);
}
