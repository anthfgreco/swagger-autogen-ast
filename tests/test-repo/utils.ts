import fs from "fs";
import { generateOpenApi } from "../../src/index";

export function generateSpec(entryFile: string, outputFile: string) {
  generateOpenApi({
    entryFile: entryFile,
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
