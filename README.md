# swagger-autogen-ast

**Zero-config OpenAPI 3.0 generation for Express.**

This is the AST-based successor to [swagger-autogen](https://www.npmjs.com/package/swagger-autogen). It uses the TypeScript Compiler API to statically analyze your routes, types, and controller logic to generate a spec that matches your code.

[![npm](https://img.shields.io/npm/v/swagger-autogen-ast)](https://www.npmjs.com/package/swagger-autogen-ast)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why?

Swagger generators are annoying. They require tons of manual config or intrusive code annotations (both which I didn't want to do).

This tool aims to make OpenAPI generation effortless by inferring as much as possible from your existing TypeScript/Express code with zero config.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Automatic Inference](#automatic-inference)
- [Overrides](#overrides)
- [How it works](#how-it-works)

## Installation

```bash
npm install swagger-autogen-ast --save-dev
```

## Usage

### CLI

The generator automatically detects your `tsconfig.json`.

```bash
npx swagger-autogen-ast ./src/index.ts ./swagger.json
```

### Programmatic

For custom configurations:

```typescript
import { generateOpenApi } from "swagger-autogen-ast";

generateOpenApi({
  entryFile: "./src/index.ts", // main Express app entry
  outputFile: "./swagger.json",
  tsconfigPath: "./tsconfig.json", // optional, auto-detected if not provided
  info: {
    title: "My API",
    version: "1.0.0",
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
      },
    },
  },
  security: [{ bearerAuth: [] }],
  servers: [{ url: "http://localhost:3000", description: "Local server" }],
});
```

### Examples

See the [/tests](./tests) directory for a complete set of examples covering all supported features and mappings to OpenAPI outputs.

## Automatic Inference

The tool relies on standard TypeScript/Express patterns.

### 1. Request Bodies & Query Params

The generator inspects **Express Generics** (preferred) and **Type Assertions**.

**Using Generics:**
It reads the 3rd argument (Body) and 4th argument (Query).

```typescript
// Infers schema from CreateUserBody and params from UserQuery
router.post(
  "/users",
  (req: Request<{}, {}, CreateUserBody, UserQuery>, res) => { ... }
);
```

**Using Assertions:**
If you don't use generics, it scans the function body for `as Type` assertions.

```typescript
router.put("/users/:id", (req, res) => {
  const body = req.body as UpdateUser; // Schema inferred
  const { status } = req.query as StatusQuery; // Params inferred
});
```

### 2. Responses

It scans for `res.json`, `res.send`, `res.status`, and `res.sendStatus`.

```typescript
router.get("/admin", async (req, res) => {
  if (!auth) return res.sendStatus(403); // -> 403 Forbidden

  const data: DashboardData = await getData();
  return res.json(data); // -> 200 OK (application/json with DashboardData schema)
});
```

### 3. Headers

It detects direct access and type assertions on `req.headers`.

```typescript
router.get("/protected", (req, res) => {
  // Automatically adds "x-api-key" (header) to parameters
  const apiKey = req.headers["x-api-key"];

  // Supports standard methods
  const auth = req.header("Authorization");
});
```

### 4. Middleware Chains

```typescript
// Infers 403 from authMiddleware, 400 from validation, and 200 from the handler
router.post("/users", authMiddleware, validationMiddleware, createUserHandler);
```

## Overrides

Manual overrides are supported with inline `#swagger` comments or JSDoc.

### Inline `#swagger`

Variables defined in comments are evaluated and merged into the operation object.

```typescript
router.post("/upload", (req, res) => {
  // #swagger.tags = ["Files"]
  // #swagger.summary = "Upload file"
  // #swagger.description = "Multipart upload only"
  // #swagger.deprecated = true

  res.status(200).send();
});
```

### JSDoc

Standard JSDoc above the route works too.

```typescript
/**
 * @summary Get User
 * @tags Users, Public
 */
router.get("/user/:id", handler);
```

## How it works

The generator starts at your `entryFile` and performs a recursive AST traversal using the TypeScript Compiler API.

1.  It follows `router.use(path, handler)` calls to build the full routing tree, resolving imports automatically.
2.  It locates route handlers (like `router.get`) and finds their original function declarations.
3.  It scans these functions for JSDoc tags, `#swagger` comments, request type assertions, and `res.status`/`res.json` calls.
4.  It converts the inferred TypeScript types into OpenAPIV3 schemas.

## License

MIT
