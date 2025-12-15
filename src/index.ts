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
  tsconfigPath?: string | undefined;
  info?: OpenApiInfo | undefined;
  servers?: OpenApiServer[] | undefined;
}

interface OpenApiInfo {
  title: string;
  version: string;
  description?: string | undefined;
}

interface OpenApiServer {
  url: string;
  description?: string | undefined;
}

interface OpenApiDocument {
  openapi: string;
  info: OpenApiInfo;
  servers: OpenApiServer[];
  paths: Record<string, Record<string, OperationObject>>;
  components: {
    schemas: Record<string, SchemaObject>;
    securitySchemes?: Record<string, any> | undefined;
  };
}

interface OperationObject {
  summary?: string | undefined;
  description?: string | undefined;
  operationId?: string | undefined;
  tags?: string[] | undefined;
  parameters?: ParameterObject[] | undefined;
  requestBody?: RequestBodyObject | undefined;
  responses: Record<string, ResponseObject>;
  deprecated?: boolean | undefined;
}

interface ParameterObject {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string | undefined;
  required?: boolean | undefined;
  schema?: SchemaObject | undefined;
}

interface RequestBodyObject {
  description?: string | undefined;
  content: Record<string, MediaTypeObject>;
  required?: boolean | undefined;
}

interface ResponseObject {
  description: string;
  content?: Record<string, MediaTypeObject> | undefined;
}

interface MediaTypeObject {
  schema?: SchemaObject | undefined;
}

interface SchemaObject {
  type?: string | undefined;
  format?: string | undefined;
  properties?: Record<string, SchemaObject> | undefined;
  items?: SchemaObject | undefined;
  required?: string[] | undefined;
  enum?: any[] | undefined;
  $ref?: string | undefined;
  oneOf?: SchemaObject[] | undefined;
  anyOf?: SchemaObject[] | undefined;
  allOf?: SchemaObject[] | undefined;
  description?: string | undefined;
  example?: any | undefined;
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

    // Handle Enums (Check flags instead of isEnum method)
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

  private extractObjectDefinition(type: ts.Type, depth: number): SchemaObject {
    const props = type.getProperties();
    const properties: Record<string, SchemaObject> = {};
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
          esModuleInterop: true,
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

    // Extract Handler
    // We grab the last argument that looks like a function or identifier
    const handlerArg = args[args.length - 1];
    if (!handlerArg) return;

    // Resolve the actual handler definition (following imports)
    const handlerNode = this.resolveHandlerNode(handlerArg);

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

  private resolvePathValue(node: ts.Node): string | undefined {
    // 1. Literal string
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return node.text;
    }

    // 2. Variable / Constant
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
          // Handle: const handler = (req, res) => ...
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

    // 2. Extract JSDoc from the handler function definition (follow imports)
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
      if (!reqParam) return;
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
            if (
              !operation.parameters!.some(
                (p) => p.name === propName && p.in === "query",
              )
            ) {
              operation.parameters!.push({
                name: propName,
                in: "query",
                schema: { type: "string" }, // Defaults to string, refinement hard without deep analysis
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
        handler.parameters[1]?.name?.getText(),
      );
    }

    this.paths[routePath][method] = operation;
  }

  private isValidSchema(schema: SchemaObject): boolean {
    return (
      (Object.keys(schema).length > 0 &&
        schema.type !== "object" &&
        Object.keys(schema).length > 1) ||
      Object.keys(schema.properties || {}).length > 0 ||
      !!schema.$ref ||
      !!schema.allOf ||
      !!schema.anyOf ||
      !!schema.oneOf
    );
  }

  private scanBodyUsage(
    node: ts.Node,
    operation: OperationObject,
    reqName: string | undefined,
    resName: string | undefined,
    visited = new Set<ts.Node>(),
  ) {
    if ((!reqName && !resName) || visited.has(node)) return;
    visited.add(node);

    const visit = (n: ts.Node) => {
      // 1. Detect Response Status: res.status(404) or res.sendStatus(500)
      if (resName && ts.isCallExpression(n)) {
        const propAccess = n.expression;
        if (ts.isPropertyAccessExpression(propAccess)) {
          const expressionText = propAccess.expression.getText();
          const methodText = propAccess.name.text;

          // Check simple: res.sendStatus(code)
          if (expressionText === resName && methodText === "sendStatus") {
            const arg = n.arguments[0];
            if (arg && ts.isNumericLiteral(arg)) {
              this.addResponse(operation, arg.text);
            }
          }

          // Check chain: res.status(code)
          if (expressionText === resName && methodText === "status") {
            const arg = n.arguments[0];
            if (arg && ts.isNumericLiteral(arg)) {
              this.addResponse(operation, arg.text);
            }
          }

          // Check response body: res.json(data) or res.send(data)
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

              if (!operation.responses["200"].content) {
                operation.responses["200"].content = {
                  "application/json": { schema },
                };
              }
            }
          }
        }
      }

      // 2. Handle Casts: const body = req.body as Type; including chained `as` expressions
      if (ts.isAsExpression(n) || ts.isTypeAssertionExpression(n)) {
        // Determine the effective type node (the one after the outermost `as`)
        let typeNode: ts.TypeNode | undefined = n.type;
        // Walk down nested as-expressions to find the underlying expression
        let expr: ts.Expression = n.expression;
        while (ts.isAsExpression(expr) || ts.isTypeAssertionExpression(expr)) {
          expr = expr.expression;
        }

        if (ts.isPropertyAccessExpression(expr)) {
          // req.body as Type
          if (
            reqName &&
            expr.expression.getText() === reqName &&
            expr.name.text === "body"
          ) {
            let schema: SchemaObject = {};
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

          // req.query as Type (support chained as: req.query as unknown as MyQuery)
          if (
            reqName &&
            expr.expression.getText() === reqName &&
            expr.name.text === "query"
          ) {
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
                    required: !(
                      (prop.getFlags() & ts.SymbolFlags.Optional) !==
                      0
                    ),
                  });
                }
              });
            }
          }
        }
      }

      ts.forEachChild(n, visit);
    };
    visit(node);
  }

  private addResponse(operation: OperationObject, code: string) {
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

      if (!keyPath || !valueStr) return;

      try {
        const value = new Function(`return ${valueStr}`)();
        if (keyPath === "tags") {
          // Merge tags instead of replacing so JSDoc + inline tags both apply
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

  private mergeMetadata(op: OperationObject, meta: any) {
    if (meta.summary) op.summary = meta.summary;
    if (meta.description) op.description = meta.description;
    if (meta.tags && meta.tags.length) op.tags = meta.tags;
    if (meta.deprecated) op.deprecated = true;
    if (meta.operationId) op.operationId = meta.operationId;
  }

  private extractJSDoc(node: ts.Node) {
    let tags = ts.getJSDocTags(node);

    // If no tags on the node, check the parent (ExpressionStatement or VariableDeclaration)
    if (tags.length === 0) {
      if (node.parent && ts.isExpressionStatement(node.parent)) {
        tags = ts.getJSDocTags(node.parent);
      } else if (node.parent && ts.isVariableDeclaration(node.parent)) {
        // Handle const handler = () => {}
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
  const { paths, schemas } = analyzer.analyze(options.entryFile);

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

/** Helper to find tsconfig recursively. */
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

  const entryFile = path.resolve(process.cwd(), args[0]!);
  const outputFile = path.resolve(process.cwd(), args[1]!);

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
