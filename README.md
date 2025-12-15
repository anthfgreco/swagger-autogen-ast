# swagger-autogen-ast

A zero-config OpenAPI 3.0 generator for Express. The AST-based spiritual successor to `swagger-autogen` with automatic type inference.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

## Overview

**swagger-autogen-ast** automates the creation of OpenAPI 3.0 specifications by statically analyzing your TypeScript source code.

Unlike other tools that require extensive JSDoc decorators, this library uses the **TypeScript Compiler API (AST)** to crawl your route files. It follows your `router.use()` imports to build a complete path map and automatically infers request bodies, query parameters, and response schemas directly from your TypeScript interfaces and logic.

## Features

- **AST-Powered Crawling:** Recursively follows imports in `router.use()` to detect nested routes and circular dependencies automatically.
- **Deep Schema Inference:** Converts TypeScript Interfaces, Enums, Unions (`|`), and Intersections (`&`) into OpenAPI Schemas.
- **Request Body Detection:**
  - Infers schema from `req.body as MyType` assertions.
  - Infers schema from Express Generics: `Request<{}, {}, MyBodyType>`.
- **Automatic Status Codes:** Scans controller logic for `res.status(404)` or `res.sendStatus(201)` to automatically register response codes.
- **Zero-Config Path Params:** Automatically converts Express style paths (`/user/:id`) to OpenAPI format (`/user/{id}`).
- **Comment Overrides:** Supports JSDoc and `#swagger` inline comments for when you need manual control.

## Installation

**Note**: Not published to npm yet!

```bash
npm install swagger-autogen-ast --save-dev
```

## Usage

Create a generator script (e.g., `generate-swagger.ts`) in your project root:

```typescript
import { generateOpenApi } from "swagger-autogen-ast";
import path from "path";

const options = {
  // Point to your main application entry file (e.g., app.ts or index.ts)
  entryFile: "./src/index.ts",
  outputFile: "./swagger.json",
  // Optional: Auto-detected if not provided
  tsconfigPath: "./tsconfig.json",
  info: {
    title: "My API",
    version: "1.0.0",
    description: "Generated via AST analysis",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local server",
    },
  ],
};

generateOpenApi(options);
```

Run the script:

```bash
npx tsx generate-swagger.ts
```

## Automatic Inference

The primary goal of this library is to minimize documentation overhead. It reads your code so you don't have to write YAML.

### 1. Request Body & Query Params via Generics

The cleanest way to document your API is using standard Express generics. The generator reads the **3rd (Body)** and **4th (Query)** generic arguments.

```typescript
import { Request, Response } from "express";

interface CreateUserBody {
  username: string;
  email: string;
}

interface UserQuery {
  includeProfile?: string;
}

// AST automatically detects:
// 1. Body schema from CreateUserBody
// 2. Query parameters from UserQuery
router.post(
  "/users",
  (req: Request<{}, {}, CreateUserBody, UserQuery>, res) => {
    // ...
  },
);
```

### 2. Request Body via Type Assertion

If you don't use generics, the generator detects type assertions (`as Type`) on `req.body` within the function body.

```typescript
router.put("/users/:id", (req, res) => {
  // The generator sees this cast and applies 'UpdateUser' as the request body schema
  const payload = req.body as UpdateUser;

  res.send("Updated");
});
```

### 3. Response Status Codes

The analyzer scans the function body for response methods. It matches standard Express patterns to generate the `responses` object in the spec.

```typescript
router.get("/admin", (req, res) => {
  if (!isAdmin) {
    return res.status(403).send(); // Adds '403: Forbidden' to spec
  }

  try {
    // ... logic
    return res.status(200).json(data); // Adds '200: OK' to spec
  } catch (e) {
    return res.sendStatus(500); // Adds '500: Internal Server Error' to spec
  }
});
```

## Manual Overrides

You can control specific endpoint details using JSDoc (above the route) or inline `#swagger` comments (inside the handler).

### Inline Configuration (`#swagger`)

This is useful for adding tags or descriptions directly inside the handler logic, keeping related code together.

```typescript
router.post("/upload", (req, res) => {
  // #swagger.tags = ["File Operations"]
  // #swagger.summary = "Upload a file"
  // #swagger.description = "Accepts multipart/form-data."
  // #swagger.deprecated = true

  // You can even override the operationId
  // #swagger.operationId = "uploadFileHandler"

  res.status(200).send();
});
```

### JSDoc Support

Standard JSDoc tags placed above the route definition are also parsed.

```typescript
/**
 * @summary Get User
 * @description Fetch a user by their unique ID
 * @tags Users, Public
 */
router.get("/user/:id", handler);
```

## How It Works

1.  **Entry Point:** The generator starts at your `entryFile`.
2.  **Recursive Crawl:** It looks for `router.use()` calls. If a router is imported from another file, the analyzer jumps to that file, appending the path prefix (e.g., `app.use('/api', apiRouter)`).
3.  **Circular Safety:** It maintains a stack of visited files to handle circular dependencies gracefully (e.g., `a.js` imports `b.js` imports `a.js`).
4.  **AST Analysis:** inside every route handler:
    - It extracts JSDoc comments.
    - It scans the function body for `#swagger` comments.
    - It scans for `res.status` calls.
    - It analyzes `req` usage for type assertions.
5.  **Schema Generation:** When a TypeScript type is encountered (like an Interface used in a request body), `SchemaBuilder` recursively generates a JSON schema, handling:
    - Primitive types
    - Arrays & Tuples
    - Nested Objects
    - Union Types (`string | number` becomes `oneOf` / `enum`)
    - Intersection Types (`TypeA & TypeB` becomes `allOf`)

## License

MIT
