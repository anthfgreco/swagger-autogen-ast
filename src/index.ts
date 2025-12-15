#!/usr/bin/env node

import fs from "fs";
import { OpenAPIV3 } from "openapi-types";
import path from "path";
import ts from "typescript";
import { fileURLToPath } from "url";

export interface GeneratorOptions {
  entryFile: string;
  outputFile: string;
  tsconfigPath?: string;
  info?: OpenAPIV3.InfoObject;
  servers?: OpenAPIV3.ServerObject[];
  security?: OpenAPIV3.SecurityRequirementObject[];
  components?: OpenAPIV3.ComponentsObject;
}

// Helper to find tsconfig up the directory tree
const findTsConfig = (startDir: string): string | undefined => {
  let dir = startDir;
  while (dir !== path.parse(dir).root) {
    const tsconfig = path.join(dir, "tsconfig.json");
    if (fs.existsSync(tsconfig)) return tsconfig;
    dir = path.dirname(dir);
  }
  return undefined;
};

class SchemaBuilder {
  private typeChecker: ts.TypeChecker;
  public definitions: Record<
    string,
    OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
  > = {};

  constructor(typeChecker: ts.TypeChecker) {
    this.typeChecker = typeChecker;
  }

  public generateSchema(
    nodeOrType: ts.Node | ts.Type,
  ): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    const type =
      "kind" in nodeOrType
        ? this.typeChecker.getTypeAtLocation(nodeOrType as ts.Node)
        : (nodeOrType as ts.Type);

    return this.typeToSchema(type);
  }

  private typeToSchema(
    type: ts.Type,
    depth = 0,
  ): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    if (depth > 10) return {};

    // Unwrap Promise<T> to T
    const unwrappedPromise = this.unwrapPromise(type);
    if (unwrappedPromise) {
      return this.typeToSchema(unwrappedPromise, depth);
    }

    const typeNodeString = this.typeChecker.typeToString(type);

    // Primitives
    if (typeNodeString === "string") return { type: "string" };
    if (typeNodeString === "number") return { type: "number" };
    if (typeNodeString === "boolean") return { type: "boolean" };
    if (typeNodeString === "any") return {};
    if (typeNodeString === "void") return {};
    if (typeNodeString === "undefined" || typeNodeString === "null") {
      return { type: "string", format: "nullable" };
    }

    // Handle Date objects explicitly
    const symbol = type.getSymbol();
    if (symbol && symbol.getName() === "Date") {
      return { type: "string", format: "date-time" };
    }

    // Handle Arrays
    if (this.isArrayType(type)) {
      const typeArgs = (type as any).typeArguments;
      const elementType = typeArgs && typeArgs.length > 0 ? typeArgs[0] : null;
      return {
        type: "array",
        items: elementType ? this.typeToSchema(elementType, depth + 1) : {},
      };
    }

    // Handle Enums
    const flags = type.getFlags();
    if (flags & ts.TypeFlags.Enum || flags & ts.TypeFlags.EnumLiteral) {
      if (
        symbol &&
        symbol.valueDeclaration &&
        ts.isEnumDeclaration(symbol.valueDeclaration)
      ) {
        const enumValues: (string | number)[] = [];
        symbol.valueDeclaration.members.forEach((member) => {
          if (member.initializer) {
            if (ts.isStringLiteral(member.initializer)) {
              enumValues.push(member.initializer.text);
            } else if (ts.isNumericLiteral(member.initializer)) {
              enumValues.push(Number(member.initializer.text));
            }
          }
        });

        if (enumValues.length > 0) {
          const isString = typeof enumValues[0] === "string";
          return { type: isString ? "string" : "number", enum: enumValues };
        }
      }
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
      const objectSymbol = type.getSymbol() || type.aliasSymbol;
      if (objectSymbol) {
        const name = objectSymbol.getName();

        // Treat complex library types as generic objects to prevent recursion hell
        if (
          name === "ReactElement" ||
          name === "CSSProperties" ||
          name === "ReactPortal" ||
          name === "Element" || // DOM Element
          name === "HTMLElement" ||
          name === "Buffer" ||
          name === "Readable"
        ) {
          return { type: "object", description: name };
        }

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

          this.definitions[name] = definition;
          return { $ref: `#/components/schemas/${name}` };
        }
      }
      return this.extractObjectDefinition(type, depth);
    }
    return { type: "object" };
  }

  private extractObjectDefinition(
    type: ts.Type,
    depth: number,
  ): OpenAPIV3.SchemaObject {
    const props = type.getProperties();
    const properties: Record<
      string,
      OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
    > = {};
    const required: string[] = [];

    for (const prop of props) {
      const propName = prop.getName();

      // Skip internal symbols
      if (propName.startsWith("__")) {
        continue;
      }

      const declaration =
        prop.valueDeclaration ||
        (prop.declarations && prop.declarations.length > 0
          ? prop.declarations[0]
          : undefined);

      if (!declaration) continue;

      // Check parent symbol to exclude standard Object methods (toString, valueOf, etc.)
      // We look at the declaration's parent (Interface/Class Declaration)
      if (declaration.parent) {
        const parentNode = declaration.parent;
        if (
          ts.isInterfaceDeclaration(parentNode) ||
          ts.isClassDeclaration(parentNode)
        ) {
          const parentName = parentNode.name?.text;
          if (parentName === "Object" || parentName === "Function") {
            continue;
          }
        }
      }

      const propType = this.typeChecker.getTypeOfSymbolAtLocation(
        prop,
        declaration,
      );

      // Skip Functions/Methods
      if (propType.getCallSignatures().length > 0) {
        continue;
      }
      const typeStr = this.typeChecker.typeToString(propType);
      if (typeStr === "Function" || typeStr.includes("=>")) {
        continue;
      }

      const isOptional = (prop.getFlags() & ts.SymbolFlags.Optional) !== 0;
      if (!isOptional) required.push(propName);

      properties[propName] = this.typeToSchema(propType, depth + 1);

      const docComment = ts.displayPartsToString(
        prop.getDocumentationComment(this.typeChecker),
      );

      if (docComment) {
        if (!("$ref" in properties[propName])) {
          (properties[propName] as OpenAPIV3.SchemaObject).description =
            docComment;
        }
      }
    }

    const schema: OpenAPIV3.SchemaObject = { type: "object" };
    if (Object.keys(properties).length > 0) {
      schema.properties = properties;
    }
    if (required.length > 0) {
      schema.required = required;
    }
    return schema;
  }

  private isArrayType(type: ts.Type): boolean {
    if (this.typeChecker.isTupleType(type)) return true;
    const symbol = type.getSymbol();
    if (!symbol) return false;
    const name = symbol.getName();
    return name === "Array" || name === "ReadonlyArray";
  }

  private unwrapPromise(type: ts.Type): ts.Type | null {
    const symbol = type.getSymbol();
    if (symbol && symbol.getName() === "Promise") {
      const typeArgs = (type as any).typeArguments;
      if (typeArgs && typeArgs.length > 0) {
        return typeArgs[0];
      }
    }
    return null;
  }
}

class RouteAnalyzer {
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private schemaBuilder: SchemaBuilder;
  private paths: OpenAPIV3.PathsObject = {};

  constructor(options: GeneratorOptions) {
    const compilerOptions: ts.CompilerOptions = options.tsconfigPath
      ? this.loadTsConfig(options.tsconfigPath)
      : {
          allowJs: true,
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
          moduleResolution: ts.ModuleResolutionKind.NodeJs,
          esModuleInterop: true,
        };

    console.log(
      `Using TS Config: ${options.tsconfigPath || "Default (None provided)"}`,
    );

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

  public analyze(entryFile: string) {
    const entrySourceFile = this.program.getSourceFile(entryFile);
    if (!entrySourceFile) {
      throw new Error("Entry file not found in program.");
    }

    // Start stack with entry file to prevent immediate self-recursion
    this.visitNode(entrySourceFile, "", new Set([entrySourceFile.fileName]));

    return {
      paths: this.paths,
      schemas: this.schemaBuilder.definitions,
    };
  }

  private visitNode(node: ts.Node, basePath: string, stack: Set<string>) {
    if (ts.isCallExpression(node)) {
      this.handleCallExpression(node, basePath, stack);
    }

    ts.forEachChild(node, (n) => this.visitNode(n, basePath, stack));
  }

  private handleCallExpression(
    node: ts.CallExpression,
    basePath: string,
    stack: Set<string>,
  ) {
    const propAccess = node.expression;
    if (!ts.isPropertyAccessExpression(propAccess)) return;

    const methodName = propAccess.name.text.toLowerCase();
    const args = node.arguments;
    if (args.length < 2) return;

    // Handle router.use()
    if (methodName === "use") {
      const pathArg = args[0];
      const handlerArg = args[1];

      if (!pathArg || !handlerArg) return;

      const usePath = this.resolvePathValue(pathArg) || "/";

      // Follow the router import
      const targetSourceFile = this.resolveHandlerSourceFile(handlerArg);
      if (targetSourceFile) {
        const fileName = targetSourceFile.fileName;

        if (stack.has(fileName)) return;

        const newBasePath = path.join(basePath, usePath).replace(/\\/g, "/");
        const nextStack = new Set(stack).add(fileName);
        this.visitNode(targetSourceFile, newBasePath, nextStack);
      }
      return;
    }

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

    // Extract Path
    const pathArg = args[0];
    if (!pathArg) return;

    // Resolve path, even if it is a variable/constant
    const routePath = this.resolvePathValue(pathArg);
    if (!routePath) return; // Could not resolve path

    let fullPath = path.join(basePath, routePath).replace(/\\/g, "/");
    if (!fullPath.startsWith("/")) fullPath = "/" + fullPath;

    // Replace :param with {param}
    const openApiPath = fullPath.replace(/:([a-zA-Z0-9_]+)/g, "{$1}");

    // Init Operation
    if (!this.paths[openApiPath]) this.paths[openApiPath] = {};
    const pathItem = this.paths[openApiPath]!;

    const operation: OpenAPIV3.OperationObject = {
      responses: {
        "200": { description: "OK" },
      },
      parameters: [],
      tags: [],
    };

    // Extract Path Params
    const pathParams = openApiPath.match(/{([^}]+)}/g);
    if (pathParams) {
      pathParams.forEach((p) => {
        const paramName = p.replace(/[{}]/g, "");
        this.addParameter(operation, paramName, "path", "string", true);
      });
    }

    // Iterate through Middlewares + Handler
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (!arg) continue;

      if (ts.isCallExpression(arg)) {
        // Skip higher order functions for now to avoid complexity (ex. checkPermissions(...))
        continue;
      }

      const handlerNode = this.resolveHandlerNode(arg);
      if (handlerNode) {
        this.analyzeHandler(handlerNode, operation, node);
      }
    }

    pathItem[methodName as OpenAPIV3.HttpMethods] = operation;
  }

  /**
   * Analyzes a single function (middleware or final handler)
   */
  private analyzeHandler(
    handler: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction,
    operation: OpenAPIV3.OperationObject,
    callNode: ts.CallExpression,
  ) {
    // Extract JSDoc from Call Node & Function Def
    this.mergeMetadata(operation, this.extractJSDoc(callNode));
    this.mergeMetadata(operation, this.extractJSDoc(handler));

    // Scan Function Body for #swagger comments
    if (handler.body && ts.isBlock(handler.body)) {
      this.scanSwaggerComments(handler.body, operation);
    }

    // Detect Param Names (req, res)
    const reqParam = handler.parameters[0];
    const resParam = handler.parameters[1];
    const reqName = reqParam?.name?.getText();
    const resName = resParam?.name?.getText();

    // Analyze Generics
    if (reqParam) {
      const reqType = this.checker.getTypeAtLocation(reqParam);

      if ((reqType as any).typeArguments) {
        const typeArgs = (reqType as any).typeArguments as ts.Type[];

        // Index 2: Request Body
        if (typeArgs[2]) {
          const bodySchema = this.schemaBuilder.generateSchema(typeArgs[2]);
          if (this.isValidSchema(bodySchema)) {
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
            this.addParameter(operation, propName, "query", "string");
          });
        }
      }
    }

    // Scan Body for Usage
    if (handler.body) {
      this.scanBodyUsage(handler.body, operation, reqName, resName);
    }
  }

  private resolvePathValue(node: ts.Node): string | undefined {
    // Literal string
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return node.text;
    }

    // Variable / Constant
    if (ts.isIdentifier(node)) {
      const type = this.checker.getTypeAtLocation(node);
      if (type.isStringLiteral()) {
        return type.value;
      }
    }

    return undefined;
  }

  /**
   * Given a node (identifier or expression), follows imports/aliases to find
   * the original SourceFile where it is defined.
   */
  private resolveHandlerSourceFile(node: ts.Node): ts.SourceFile | undefined {
    let symbol = this.checker.getSymbolAtLocation(node);
    if (!symbol) return undefined;

    if (symbol.flags & ts.SymbolFlags.Alias) {
      symbol = this.checker.getAliasedSymbol(symbol);
    }

    const decl = symbol.declarations?.[0];
    if (!decl) return undefined;

    const sourceFile = decl.getSourceFile();
    if (
      sourceFile.isDeclarationFile ||
      sourceFile.fileName.includes("node_modules")
    ) {
      return undefined;
    }

    return sourceFile;
  }

  /**
   * Follows imports to find the actual Function/ArrowFunction declaration.
   */
  private resolveHandlerNode(
    node: ts.Node,
  ):
    | ts.FunctionDeclaration
    | ts.FunctionExpression
    | ts.ArrowFunction
    | undefined {
    if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      return node;
    }

    if (ts.isIdentifier(node)) {
      let symbol = this.checker.getSymbolAtLocation(node);
      if (symbol) {
        if (symbol.flags & ts.SymbolFlags.Alias) {
          symbol = this.checker.getAliasedSymbol(symbol);
        }
        const decl =
          symbol.valueDeclaration ||
          (symbol.declarations && symbol.declarations[0]);

        if (decl) {
          if (
            ts.isFunctionDeclaration(decl) ||
            ts.isFunctionExpression(decl) ||
            ts.isArrowFunction(decl)
          ) {
            return decl;
          }
          if (ts.isVariableDeclaration(decl) && decl.initializer) {
            if (
              ts.isArrowFunction(decl.initializer) ||
              ts.isFunctionExpression(decl.initializer)
            ) {
              return decl.initializer;
            }
          }
        }
      }
    }
    return undefined;
  }

  private addParameter(
    operation: OpenAPIV3.OperationObject,
    name: string,
    location: "query" | "header" | "path" | "cookie",
    type: "string" | "number" | "boolean",
    required = false,
  ) {
    if (!operation.parameters) operation.parameters = [];

    // Avoid duplicates
    if (
      operation.parameters.some(
        (p) => "name" in p && p.name === name && p.in === location,
      )
    ) {
      return;
    }

    operation.parameters.push({
      name,
      in: location,
      schema: { type },
      required,
    });
  }

  private isValidSchema(
    schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  ): boolean {
    if ("$ref" in schema) return true;
    return (
      (Object.keys(schema).length > 0 &&
        schema.type !== "object" &&
        Object.keys(schema).length > 1) ||
      Object.keys(schema.properties || {}).length > 0 ||
      !!schema.allOf ||
      !!schema.anyOf ||
      !!schema.oneOf
    );
  }

  private scanBodyUsage(
    node: ts.Node,
    operation: OpenAPIV3.OperationObject,
    reqName: string | undefined,
    resName: string | undefined,
    visited = new Set<ts.Node>(),
  ) {
    if ((!reqName && !resName) || visited.has(node)) return;
    visited.add(node);

    const visit = (n: ts.Node) => {
      // Detect Response Status
      if (resName && ts.isCallExpression(n)) {
        const propAccess = n.expression;
        if (ts.isPropertyAccessExpression(propAccess)) {
          const expressionText = propAccess.expression.getText();
          const methodText = propAccess.name.text;

          if (expressionText === resName) {
            // res.sendStatus(code) or res.status(code)
            if (methodText === "sendStatus" || methodText === "status") {
              const arg = n.arguments[0];
              if (arg && ts.isNumericLiteral(arg)) {
                this.addResponse(operation, arg.text);
              }
            }

            // res.json(data) or res.send(data)
            if (
              (methodText === "json" || methodText === "send") &&
              n.arguments.length > 0
            ) {
              const arg = n.arguments[0];
              if (arg) {
                const responseType = this.checker.getTypeAtLocation(arg);
                const schema = this.schemaBuilder.generateSchema(responseType);

                if (!operation.responses["200"]) {
                  operation.responses["200"] = { description: "OK" };
                }

                const successResponse = operation.responses[
                  "200"
                ] as OpenAPIV3.ResponseObject;

                if (!successResponse.content) {
                  successResponse.content = {
                    "application/json": { schema },
                  };
                }
              }
            }
          }
        }
      }

      // Handle Casts (req.body as Type, req.headers as Type)
      if (ts.isAsExpression(n) || ts.isTypeAssertionExpression(n)) {
        let typeNode: ts.TypeNode | undefined = n.type;
        let expr: ts.Expression = n.expression;
        while (ts.isAsExpression(expr) || ts.isTypeAssertionExpression(expr)) {
          expr = expr.expression;
        }

        if (ts.isPropertyAccessExpression(expr) && reqName) {
          if (expr.expression.getText() === reqName) {
            // req.body as Type
            if (expr.name.text === "body") {
              let schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject =
                {};
              try {
                const t = typeNode
                  ? this.checker.getTypeFromTypeNode(typeNode)
                  : this.checker.getTypeAtLocation(n);
                schema = this.schemaBuilder.generateSchema(t);
              } catch (e) {
                schema = this.schemaBuilder.generateSchema(n.type as any);
              }
              if (this.isValidSchema(schema)) {
                operation.requestBody = {
                  content: { "application/json": { schema: schema } },
                };
              }
            }

            // req.query as Type
            if (expr.name.text === "query") {
              let queryType: ts.Type | undefined;
              if (typeNode) {
                try {
                  queryType = this.checker.getTypeFromTypeNode(typeNode);
                } catch (e) {
                  queryType = this.checker.getTypeAtLocation(n.type);
                }
              } else {
                queryType = this.checker.getTypeAtLocation(n);
              }

              if (queryType) {
                const props = queryType.getProperties();
                props.forEach((prop) => {
                  this.addParameter(
                    operation,
                    prop.getName(),
                    "query",
                    "string",
                  );
                });
              }
            }

            // req.headers as Type
            if (expr.name.text === "headers") {
              let headerType: ts.Type | undefined;
              if (typeNode) {
                try {
                  headerType = this.checker.getTypeFromTypeNode(typeNode);
                } catch (e) {
                  headerType = this.checker.getTypeAtLocation(n.type);
                }
              } else {
                headerType = this.checker.getTypeAtLocation(n);
              }

              if (headerType) {
                const props = headerType.getProperties();
                props.forEach((prop) => {
                  const pName = prop.getName();
                  if (
                    pName.toLowerCase() !== "authorization" &&
                    pName.toLowerCase() !== "content-type"
                  ) {
                    this.addParameter(operation, pName, "header", "string");
                  }
                });
              }
            }
          }
        }
      }

      // Detect direct header access
      // Case: req.headers['x-key'] or req.headers.key
      if (
        (ts.isElementAccessExpression(n) || ts.isPropertyAccessExpression(n)) &&
        reqName
      ) {
        const expression = n.expression;
        if (
          ts.isPropertyAccessExpression(expression) &&
          expression.expression.getText() === reqName &&
          expression.name.text === "headers"
        ) {
          let headerName: string | undefined;
          if (ts.isElementAccessExpression(n)) {
            if (ts.isStringLiteral(n.argumentExpression)) {
              headerName = n.argumentExpression.text;
            }
          } else {
            headerName = n.name.text;
          }

          if (headerName && headerName.toLowerCase() !== "content-type") {
            this.addParameter(operation, headerName, "header", "string");
          }
        }
      }

      // Case: req.header('x-key') or req.get('x-key')
      if (ts.isCallExpression(n) && reqName) {
        if (ts.isPropertyAccessExpression(n.expression)) {
          if (n.expression.expression.getText() === reqName) {
            const method = n.expression.name.text;
            if (
              (method === "header" || method === "get") &&
              n.arguments.length > 0
            ) {
              const arg = n.arguments[0];
              if (arg && ts.isStringLiteral(arg)) {
                if (arg.text.toLowerCase() !== "content-type") {
                  this.addParameter(operation, arg.text, "header", "string");
                }
              }
            }
          }
        }
      }

      ts.forEachChild(n, visit);
    };
    visit(node);
  }

  private addResponse(operation: OpenAPIV3.OperationObject, code: string) {
    if (!operation.responses[code]) {
      const descriptions: Record<string, string> = {
        "200": "OK",
        "201": "Created",
        "204": "No Content",
        "400": "Bad Request",
        "401": "Unauthorized",
        "403": "Forbidden",
        "404": "Not Found",
        "500": "Internal Server Error",
      };
      operation.responses[code] = {
        description: descriptions[code] || "Status " + code,
      };
    }
  }

  private scanSwaggerComments(
    body: ts.Block,
    operation: OpenAPIV3.OperationObject,
  ) {
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

  private parseSwaggerComment(
    comment: string,
    operation: OpenAPIV3.OperationObject,
  ) {
    const content = comment
      .replace(/^\/\//, "")
      .replace(/^\/\*/, "")
      .replace(/\*\/$/, "")
      .trim();

    const match = content.match(/#swagger\.([\w\.]+)\s*=\s*(.+)/);
    if (match) {
      const keyPath = match[1];
      const valueStr = match[2];

      if (!keyPath || !valueStr) return;

      try {
        const value = new Function(`return ${valueStr}`)();
        if (keyPath === "tags") {
          const existing = operation.tags || [];
          if (Array.isArray(value)) {
            operation.tags = Array.from(new Set([...existing, ...value]));
          } else if (typeof value === "string") {
            operation.tags = Array.from(new Set([...existing, value]));
          }
        } else if (keyPath === "description") operation.description = value;
        else if (keyPath === "summary") operation.summary = value;
        else if (keyPath === "deprecated") operation.deprecated = !!value;
        else if (keyPath === "operationId") operation.operationId = value;
        else this.setDeepValue(operation, keyPath, value);
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
      if (part && !current[part]) current[part] = {};
      if (part) current = current[part];
    }
    const lastPart = parts[parts.length - 1];
    if (lastPart) current[lastPart] = value;
  }

  private mergeMetadata(op: OpenAPIV3.OperationObject, meta: any) {
    if (meta.summary) op.summary = meta.summary;
    if (meta.description) op.description = meta.description;
    if (meta.tags && meta.tags.length) {
      op.tags = Array.from(new Set([...(op.tags || []), ...meta.tags]));
    }
    if (meta.deprecated) op.deprecated = true;
    if (meta.operationId) op.operationId = meta.operationId;
  }

  private extractJSDoc(node: ts.Node) {
    let tags = ts.getJSDocTags(node);

    if (tags.length === 0) {
      if (node.parent && ts.isExpressionStatement(node.parent)) {
        tags = ts.getJSDocTags(node.parent);
      } else if (node.parent && ts.isVariableDeclaration(node.parent)) {
        if (
          node.parent.parent &&
          ts.isVariableDeclarationList(node.parent.parent)
        ) {
          tags = ts.getJSDocTags(node.parent.parent.parent);
        }
      }
    }

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

export function generateOpenApi(options: GeneratorOptions) {
  const absoluteEntry = path.resolve(process.cwd(), options.entryFile);
  if (!fs.existsSync(absoluteEntry)) {
    throw new Error(`Entry file not found: ${options.entryFile}`);
  }

  // Auto-discover tsconfig if not provided
  if (!options.tsconfigPath) {
    options.tsconfigPath = findTsConfig(path.dirname(absoluteEntry));
  }

  console.log("Analyzing AST...");

  const analyzer = new RouteAnalyzer(options);
  const { paths, schemas } = analyzer.analyze(options.entryFile);

  // Merge generated schemas with user provided components
  const finalSchemas = { ...schemas, ...(options.components?.schemas || {}) };

  const doc: OpenAPIV3.Document = {
    openapi: "3.0.0",
    info: options.info || {
      title: "Auto Generated API",
      version: "1.0.0",
    },
    servers: options.servers || [],
    security: options.security || [],
    paths: paths,
    components: {
      ...options.components,
      schemas: finalSchemas,
      securitySchemes: options.components?.securitySchemes || {},
    },
  };

  console.log(`Found ${Object.keys(paths).length} paths.`);
  console.log(`Generated ${Object.keys(schemas).length} schemas.`);

  fs.writeFileSync(options.outputFile, JSON.stringify(doc, null, 2));
  console.log(`Swagger file saved to: ${options.outputFile}`);
}

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

if (isMain()) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log(
      "Usage: npx ts-node swagger-generator.ts <entryFile> <outputFile> [tsconfigPath]",
    );
    process.exit(1);
  }

  const entryFile = path.resolve(process.cwd(), args[0]!);
  const outputFile = path.resolve(process.cwd(), args[1]!);

  const tsconfigPath = args[2]
    ? path.resolve(process.cwd(), args[2])
    : undefined;

  const options: GeneratorOptions = {
    entryFile,
    outputFile,
    tsconfigPath,
    info: {
      title: "My API",
      version: "1.0.0",
      description: "Generated via AST analysis",
    },
    servers: [{ url: "http://localhost:3000" }],
  };

  try {
    generateOpenApi(options);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
