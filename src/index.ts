#!/usr/bin/env node

import fs from "fs";
import path from "path";
import ts from "typescript";
import { fileURLToPath } from "url";

/**
 * -------------------------------------------------------------------------
 * Types & Interfaces
 * -------------------------------------------------------------------------
 */

interface GeneratorOptions {
  entryFile: string;
  outputFile: string;
  tsconfigPath?: string;
  info?: OpenApiInfo;
  servers?: OpenApiServer[];
}

interface OpenApiInfo {
  title: string;
  version: string;
  description?: string;
}

interface OpenApiServer {
  url: string;
  description?: string;
}

interface OpenApiDocument {
  openapi: string;
  info: OpenApiInfo;
  servers: OpenApiServer[];
  paths: Record<string, Record<string, OperationObject>>;
  components: {
    schemas: Record<string, SchemaObject>;
    securitySchemes?: Record<string, any>;
  };
}

interface OperationObject {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses: Record<string, ResponseObject>;
  deprecated?: boolean;
}

interface ParameterObject {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  schema?: SchemaObject;
}

interface RequestBodyObject {
  description?: string;
  content: Record<string, MediaTypeObject>;
  required?: boolean;
}

interface ResponseObject {
  description: string;
  content?: Record<string, MediaTypeObject>;
}

interface MediaTypeObject {
  schema?: SchemaObject;
}

interface SchemaObject {
  type?: string;
  format?: string;
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  required?: string[];
  enum?: any[];
  $ref?: string;
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  allOf?: SchemaObject[];
  description?: string;
  example?: any;
}

/**
 * -------------------------------------------------------------------------
 * AST & Schema Analysis
 * -------------------------------------------------------------------------
 */

class SchemaBuilder {
  private typeChecker: ts.TypeChecker;
  public definitions: Record<string, SchemaObject> = {};

  constructor(typeChecker: ts.TypeChecker) {
    this.typeChecker = typeChecker;
  }

  public generateSchema(nodeOrType: ts.Node | ts.Type): SchemaObject {
    const type =
      "kind" in nodeOrType
        ? this.typeChecker.getTypeAtLocation(nodeOrType as ts.Node)
        : (nodeOrType as ts.Type);

    return this.typeToSchema(type);
  }

  private typeToSchema(type: ts.Type, depth = 0): SchemaObject {
    if (depth > 10) return {};

    const typeNodeString = this.typeChecker.typeToString(type);

    if (typeNodeString === "string") return { type: "string" };
    if (typeNodeString === "number") return { type: "number" };
    if (typeNodeString === "boolean") return { type: "boolean" };
    if (typeNodeString === "any") return {};
    if (typeNodeString === "void") return {};
    if (typeNodeString === "undefined" || typeNodeString === "null")
      return { type: "string", format: "nullable" };

    // Handle Arrays
    if (this.isArrayType(type)) {
      const typeArgs = (type as any).typeArguments;
      const elementType = typeArgs && typeArgs.length > 0 ? typeArgs[0] : null;
      return {
        type: "array",
        items: elementType ? this.typeToSchema(elementType, depth + 1) : {},
      };
    }

    // Handle Unions
    if (type.isUnion()) {
      const types = type.types.map((t) => this.typeToSchema(t, depth + 1));
      const isAllLiteral = type.types.every((t) => t.isStringLiteral());
      if (isAllLiteral) {
        return {
          type: "string",
          enum: type.types.map((t) => (t as ts.StringLiteralType).value),
        };
      }
      return { anyOf: types };
    }

    // Handle Intersections
    if (type.isIntersection()) {
      const types = type.types.map((t) => this.typeToSchema(t, depth + 1));
      return { allOf: types };
    }

    // Handle Objects / Interfaces / Classes / Type Aliases
    if (
      type.isClassOrInterface() ||
      type.aliasSymbol ||
      type.getFlags() & ts.TypeFlags.Object
    ) {
      const symbol = type.getSymbol() || type.aliasSymbol;
      if (symbol) {
        const name = symbol.getName();
        // Filter out internal/standard types
        if (
          name !== "Object" &&
          name !== "Promise" &&
          name !== "__type" &&
          name !== "Array" &&
          name !== "Request" &&
          name !== "Response" &&
          name !== "Function"
        ) {
          if (this.definitions[name]) {
            return { $ref: `#/components/schemas/${name}` };
          }

          // Reserve to prevent cycles
          this.definitions[name] = {};
          const definition = this.extractObjectDefinition(type, depth);

          // If definition is empty, maybe it's just an alias to a primitive?
          if (
            !definition.properties &&
            !definition.allOf &&
            !definition.anyOf &&
            definition.type === "object"
          ) {
            // It might be a type alias to a primitive that got wrapped.
            // But usually extractObjectDefinition handles properties.
            // If properties is empty, check if it is truly empty object or error.
            if (Object.keys(definition).length === 1) {
              // Try unwrapping alias if possible or fall through
            }
          }

          this.definitions[name] = definition;
          return { $ref: `#/components/schemas/${name}` };
        }
      }

      return this.extractObjectDefinition(type, depth);
    }

    return { type: "object" };
  }

  private extractObjectDefinition(type: ts.Type, depth: number): SchemaObject {
    const props = type.getProperties();
    const properties: Record<string, SchemaObject> = {};
    const required: string[] = [];

    for (const prop of props) {
      const propName = prop.getName();

      // Fix: Ensure we have a declaration before attempting to get the type at location.
      // Synthetic properties (from Omit/Pick/Mapped types) might not have accessible declarations.
      const declaration =
        prop.valueDeclaration ||
        (prop.declarations && prop.declarations.length > 0
          ? prop.declarations[0]
          : undefined);

      if (!declaration) {
        // We cannot reliably determine context without a declaration node.
        // We skip this property to avoid crashing.
        continue;
      }

      const propType = this.typeChecker.getTypeOfSymbolAtLocation(
        prop,
        declaration,
      );

      const isOptional = (prop.getFlags() & ts.SymbolFlags.Optional) !== 0;
      if (!isOptional) required.push(propName);

      properties[propName] = this.typeToSchema(propType, depth + 1);

      const docComment = ts.displayPartsToString(
        prop.getDocumentationComment(this.typeChecker),
      );

      if (docComment) {
        properties[propName].description = docComment;
      }
    }

    return {
      type: "object",
      properties: Object.keys(properties).length > 0 ? properties : undefined,
      required: required.length > 0 ? required : undefined,
    };
  }

  private isArrayType(type: ts.Type): boolean {
    const symbol = type.getSymbol();
    if (!symbol) return false;
    return symbol.getName() === "Array";
  }
}

/**
 * -------------------------------------------------------------------------
 * Route Analysis
 * -------------------------------------------------------------------------
 */

class RouteAnalyzer {
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private schemaBuilder: SchemaBuilder;
  private paths: Record<string, Record<string, OperationObject>> = {};

  constructor(options: GeneratorOptions) {
    const compilerOptions: ts.CompilerOptions = options.tsconfigPath
      ? this.loadTsConfig(options.tsconfigPath)
      : {
          allowJs: true,
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
          moduleResolution: ts.ModuleResolutionKind.NodeJs,
          esModuleInterop: true, // Often needed
        };

    console.log(`Using TS Config: ${options.tsconfigPath || "Default"}`);

    // createProgram will resolve imported files automatically
    this.program = ts.createProgram([options.entryFile], compilerOptions);
    this.checker = this.program.getTypeChecker();
    this.schemaBuilder = new SchemaBuilder(this.checker);
  }

  private loadTsConfig(configPath: string): ts.CompilerOptions {
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (configFile.error) {
      console.error("Error reading tsconfig:", configFile.error);
      return {};
    }
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(configPath),
    );
    return parsedConfig.options;
  }

  public analyze() {
    for (const sourceFile of this.program.getSourceFiles()) {
      if (
        sourceFile.isDeclarationFile ||
        sourceFile.fileName.includes("node_modules")
      )
        continue;
      this.visitNode(sourceFile);
    }

    return {
      paths: this.paths,
      schemas: this.schemaBuilder.definitions,
    };
  }

  private visitNode(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      this.handleCallExpression(node);
    }
    ts.forEachChild(node, (n) => this.visitNode(n));
  }

  private handleCallExpression(node: ts.CallExpression) {
    const propAccess = node.expression;
    if (!ts.isPropertyAccessExpression(propAccess)) return;

    const methodName = propAccess.name.text.toLowerCase();
    const validMethods = [
      "get",
      "post",
      "put",
      "delete",
      "patch",
      "options",
      "head",
    ];

    if (!validMethods.includes(methodName)) return;

    const args = node.arguments;
    if (args.length < 2) return;

    // Extract Path
    const pathArg = args[0];
    let routePath = "/";

    if (ts.isStringLiteral(pathArg)) {
      routePath = pathArg.text;
    } else if (ts.isNoSubstitutionTemplateLiteral(pathArg)) {
      routePath = pathArg.text;
    } else {
      routePath = "/unknown-dynamic-path";
    }

    const openApiPath = routePath.replace(/:([a-zA-Z0-9_]+)/g, "{$1}");

    // Extract Handler
    // We grab the last argument as the handler
    const handlerArg = args[args.length - 1];

    let handlerNode: ts.Node | undefined = handlerArg;

    // If it's an Identifier (e.g. `shareDocument`), find the declaration
    if (ts.isIdentifier(handlerArg)) {
      const symbol = this.checker.getSymbolAtLocation(handlerArg);
      if (symbol) {
        // Find the actual declaration (FunctionDeclaration, VariableDeclaration, etc)
        // We use valueDeclaration or the first declaration
        const decl =
          symbol.valueDeclaration ||
          (symbol.declarations && symbol.declarations[0]);
        if (decl) {
          handlerNode = decl;
        }
      }
    }

    if (handlerNode) {
      if (
        ts.isFunctionExpression(handlerNode) ||
        ts.isArrowFunction(handlerNode) ||
        ts.isFunctionDeclaration(handlerNode)
      ) {
        this.addOperation(openApiPath, methodName, handlerNode, node);
      }
    }
  }

  private addOperation(
    routePath: string,
    method: string,
    handler: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction,
    callNode: ts.CallExpression,
  ) {
    if (!this.paths[routePath]) this.paths[routePath] = {};

    const operation: OperationObject = {
      responses: {
        "200": { description: "OK" },
      },
      parameters: [],
      tags: [],
    };

    // 1. Extract JSDoc from the `router.get(...)` call itself
    const callJSDoc = this.extractJSDoc(callNode);
    this.mergeMetadata(operation, callJSDoc);

    // 2. Extract JSDoc from the handler function definition
    const handlerJSDoc = this.extractJSDoc(handler);
    this.mergeMetadata(operation, handlerJSDoc);

    // 3. Scan Function Body for #swagger comments
    if (handler.body && ts.isBlock(handler.body)) {
      this.scanSwaggerComments(handler.body, operation);
    }

    // 4. Path Parameters
    const pathParams = routePath.match(/{([^}]+)}/g);
    if (pathParams) {
      pathParams.forEach((p) => {
        const paramName = p.replace(/[{}]/g, "");
        if (
          !operation.parameters!.some(
            (ex) => ex.name === paramName && ex.in === "path",
          )
        ) {
          operation.parameters!.push({
            name: paramName,
            in: "path",
            required: true,
            schema: { type: "string" },
          });
        }
      });
    }

    // 5. Types (Request<Params, Res, Body, Query>)
    if (handler.parameters.length >= 2) {
      const reqParam = handler.parameters[0];
      const reqType = this.checker.getTypeAtLocation(reqParam);

      if ((reqType as any).typeArguments) {
        const typeArgs = (reqType as any).typeArguments as ts.Type[];

        // Index 2: Request Body
        if (typeArgs[2]) {
          const bodySchema = this.schemaBuilder.generateSchema(typeArgs[2]);
          if (
            (Object.keys(bodySchema).length > 0 &&
              bodySchema.type !== "object" &&
              Object.keys(bodySchema).length > 1) ||
            Object.keys(bodySchema.properties || {}).length > 0 ||
            bodySchema.$ref
          ) {
            operation.requestBody = {
              content: {
                "application/json": { schema: bodySchema },
              },
            };
          }
        }

        // Index 3: Query Params
        if (typeArgs[3]) {
          const queryProps = typeArgs[3].getProperties();
          queryProps.forEach((prop) => {
            const propName = prop.getName();
            if (
              !operation.parameters!.some(
                (p) => p.name === propName && p.in === "query",
              )
            ) {
              operation.parameters!.push({
                name: propName,
                in: "query",
                schema: { type: "string" },
              });
            }
          });
        }
      }
    }

    // 6. Analyze Function Body for usage (recursive)
    if (handler.body) {
      this.scanBodyUsage(
        handler.body,
        operation,
        handler.parameters[0]?.name?.getText(),
      );
    }

    this.paths[routePath][method] = operation;
  }

  private scanBodyUsage(
    node: ts.Node,
    operation: OperationObject,
    reqName: string | undefined,
    visited = new Set<ts.Node>(),
  ) {
    if (!reqName || visited.has(node)) return;
    visited.add(node);

    const visit = (n: ts.Node) => {
      // 1. Handle Casts: const body = req.body as Type;
      if (ts.isAsExpression(n) || ts.isTypeAssertionExpression(n)) {
        if (ts.isPropertyAccessExpression(n.expression)) {
          if (
            n.expression.expression.getText() === reqName &&
            n.expression.name.text === "body"
          ) {
            const schema = this.schemaBuilder.generateSchema(n.type);

            // Check if valid schema was generated
            if (Object.keys(schema).length > 0) {
              // If it's a plain object with no props, ignore it unless it's a ref or allOf
              const isEmptyObject =
                schema.type === "object" &&
                !schema.properties &&
                !schema.allOf &&
                !schema.oneOf &&
                !schema.$ref;
              if (!isEmptyObject) {
                operation.requestBody = {
                  content: {
                    "application/json": { schema: schema },
                  },
                };
              }
            }
          }
        }
      }

      // 2. Handle Destructuring: const { userId } = req.query;
      if (ts.isVariableDeclaration(n)) {
        if (
          n.initializer &&
          ts.isPropertyAccessExpression(n.initializer) &&
          n.initializer.expression.getText() === reqName &&
          n.initializer.name.text === "query"
        ) {
          if (ts.isObjectBindingPattern(n.name)) {
            n.name.elements.forEach((element) => {
              if (ts.isBindingElement(element)) {
                let paramName = "";
                // Handle renaming: const { queryParam: localVar } = req.query
                if (
                  element.propertyName &&
                  ts.isIdentifier(element.propertyName)
                ) {
                  paramName = element.propertyName.text;
                } else if (ts.isIdentifier(element.name)) {
                  paramName = element.name.text;
                }

                if (paramName) {
                  const exists = operation.parameters!.find(
                    (p) => p.name === paramName && p.in === "query",
                  );
                  if (!exists) {
                    operation.parameters!.push({
                      name: paramName,
                      in: "query",
                      schema: { type: "string" },
                    });
                  }
                }
              }
            });
          }
        }
      }

      // 3. Handle Direct Usage: req.body (infers generic object)
      if (ts.isPropertyAccessExpression(n)) {
        if (n.expression.getText() === reqName && n.name.text === "body") {
          if (!operation.requestBody) {
            operation.requestBody = {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    example: { _note: "Inferred from code usage" },
                  },
                },
              },
            };
          }
        }

        if (
          ts.isPropertyAccessExpression(n.expression) &&
          n.expression.expression.getText() === reqName &&
          n.expression.name.text === "query"
        ) {
          const paramName = n.name.text;
          const exists = operation.parameters!.find(
            (p) => p.name === paramName && p.in === "query",
          );
          if (!exists) {
            operation.parameters!.push({
              name: paramName,
              in: "query",
              schema: { type: "string" },
            });
          }
        }
      }

      // 3. Handle Function Calls: myFunc(req)
      if (ts.isCallExpression(n)) {
        n.arguments.forEach((arg, index) => {
          if (ts.isIdentifier(arg) && arg.text === reqName) {
            let symbol = this.checker.getSymbolAtLocation(n.expression);
            if (!symbol && ts.isPropertyAccessExpression(n.expression)) {
              symbol = this.checker.getSymbolAtLocation(n.expression.name);
            }

            if (symbol) {
              if (symbol.flags & ts.SymbolFlags.Alias) {
                symbol = this.checker.getAliasedSymbol(symbol);
              }

              const decl =
                symbol.valueDeclaration ||
                (symbol.declarations && symbol.declarations[0]);

              if (
                decl &&
                (ts.isFunctionDeclaration(decl) ||
                  ts.isMethodDeclaration(decl) ||
                  ts.isArrowFunction(decl) ||
                  ts.isFunctionExpression(decl))
              ) {
                const param = decl.parameters[index];
                if (param && ts.isIdentifier(param.name)) {
                  const newReqName = param.name.text;
                  if (decl.body) {
                    this.scanBodyUsage(
                      decl.body,
                      operation,
                      newReqName,
                      visited,
                    );
                  }
                }
              }
            }
          }
        });
      }

      ts.forEachChild(n, visit);
    };

    visit(node);
  }

  private scanSwaggerComments(body: ts.Block, operation: OperationObject) {
    const sourceFile = body.getSourceFile();
    const fullText = sourceFile.getFullText();

    const visitStatement = (node: ts.Node) => {
      const ranges = ts.getLeadingCommentRanges(fullText, node.pos);
      if (ranges) {
        for (const range of ranges) {
          const comment = fullText.substring(range.pos, range.end);
          this.parseSwaggerComment(comment, operation);
        }
      }
    };

    body.statements.forEach(visitStatement);
  }

  private parseSwaggerComment(comment: string, operation: OperationObject) {
    const content = comment
      .replace(/^\/\//, "")
      .replace(/^\/\*/, "")
      .replace(/\*\/$/, "")
      .trim();

    const match = content.match(/#swagger\.([\w\.]+)\s*=\s*(.+)/);
    if (match) {
      const keyPath = match[1];
      const valueStr = match[2];

      try {
        const value = new Function(`return ${valueStr}`)();

        if (keyPath === "tags") {
          operation.tags = value;
        } else if (keyPath === "description") {
          operation.description = value;
        } else if (keyPath === "summary") {
          operation.summary = value;
        } else if (keyPath === "deprecated") {
          operation.deprecated = !!value;
        } else if (keyPath === "operationId") {
          operation.operationId = value;
        } else {
          this.setDeepValue(operation, keyPath, value);
        }
      } catch (e) {
        console.warn(`Failed to parse swagger comment: ${content}`, e);
      }
    }
  }

  private setDeepValue(obj: any, path: string, value: any) {
    const parts = path.split(".");
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) current[part] = {};
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
  }

  private mergeMetadata(op: OperationObject, meta: any) {
    if (meta.summary) op.summary = meta.summary;
    if (meta.description) op.description = meta.description;
    if (meta.tags && meta.tags.length) op.tags = meta.tags;
    if (meta.deprecated) op.deprecated = true;
    if (meta.operationId) op.operationId = meta.operationId;
  }

  private extractJSDoc(node: ts.Node) {
    const tags = ts.getJSDocTags(node);
    const result: any = { tags: [] };

    tags.forEach((tag) => {
      const comment = ts.getTextOfJSDocComment(tag.comment);
      const tagName = tag.tagName.text;

      if (tagName === "summary") result.summary = comment;
      if (tagName === "description") result.description = comment;
      if (tagName === "deprecated") result.deprecated = true;
      if (tagName === "operationId") result.operationId = comment;
      if (tagName === "tags" && comment) {
        result.tags = comment.split(",").map((t) => t.trim());
      }
    });

    return result;
  }
}

/**
 * -------------------------------------------------------------------------
 * Main Logic
 * -------------------------------------------------------------------------
 */

export function generateOpenApi(options: GeneratorOptions) {
  if (!fs.existsSync(options.entryFile)) {
    throw new Error(`Entry file not found: ${options.entryFile}`);
  }

  console.log("🔍 Analyzing AST...");

  const analyzer = new RouteAnalyzer(options);
  const { paths, schemas } = analyzer.analyze();

  const doc: OpenApiDocument = {
    openapi: "3.0.0",
    info: options.info || {
      title: "Auto Generated API",
      version: "1.0.0",
    },
    servers: options.servers || [],
    paths: paths,
    components: {
      schemas: schemas,
    },
  };

  console.log(`✅ Found ${Object.keys(paths).length} paths.`);
  console.log(`✅ Generated ${Object.keys(schemas).length} schemas.`);

  fs.writeFileSync(options.outputFile, JSON.stringify(doc, null, 2));
  console.log(`💾 Swagger file saved to: ${options.outputFile}`);
}

/**
 * -------------------------------------------------------------------------
 * CLI Execution Check
 * -------------------------------------------------------------------------
 */

const isMain = () => {
  if (import.meta && import.meta.url) {
    const entryFile = process.argv[1];
    const currentFile = fileURLToPath(import.meta.url);
    return (
      entryFile === currentFile ||
      entryFile === currentFile.replace(/\//g, "\\")
    );
  }
  return false;
};

// Helper to find tsconfig recursively
const findTsConfig = (startDir: string): string | undefined => {
  let dir = startDir;
  while (dir !== path.parse(dir).root) {
    const tsconfig = path.join(dir, "tsconfig.json");
    if (fs.existsSync(tsconfig)) return tsconfig;
    dir = path.dirname(dir);
  }
  return undefined;
};

if (isMain()) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log(
      "Usage: npx ts-node swagger-generator.ts <entryFile> <outputFile> [tsconfigPath]",
    );
    process.exit(1);
  }

  const entryFile = path.resolve(process.cwd(), args[0]);
  const outputFile = path.resolve(process.cwd(), args[1]);

  // Auto-detect tsconfig if not provided
  let tsconfigPath = args[2] ? path.resolve(process.cwd(), args[2]) : undefined;
  if (!tsconfigPath) {
    tsconfigPath = findTsConfig(path.dirname(entryFile));
  }

  generateOpenApi({
    entryFile,
    outputFile,
    tsconfigPath,
    info: {
      title: "My API",
      version: "1.0.0",
      description: "Generated via AST analysis",
    },
    servers: [{ url: "http://localhost:3000" }],
  });
}
