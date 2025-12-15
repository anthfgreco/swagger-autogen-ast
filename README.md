# swagger-autogen-ast

A zero-config OpenAPI 3.0 generator for Express. The AST-based spiritual successor to `swagger-autogen` with automatic type inference.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

## Overview

**swagger-autogen-ast** automates the creation of OpenAPI 3.0 specifications by statically analyzing your TypeScript source code.

Unlike other tools that require extensive JSDoc decorators, this library uses the **TypeScript Compiler API (AST)** to crawl your route files. It follows your `router.use()` imports to build a complete path map and automatically infers request bodies, query parameters, and response schemas directly from your TypeScript interfaces and logic.

## Features

- **AST-Powered Crawling:** Recursively follows imports in `router.use()` and controller functions to analyze code across files.
- **Deep Schema Inference:** Converts TypeScript Interfaces, Enums, Unions, Intersections, and `Date` objects into OpenAPI Schemas.
- **Request Body & Query Detection:**
  - Infers schema from `req.body` and `req.query` type assertions (`as MyType`).
  - Infers schema from Express Generics: `Request<{}, {}, MyBodyType>`.
- **Response Body Inference:** automatically generates schemas from `res.json(data)` and `res.send(data)` calls.
- **Smart Path Resolution:** Resolves paths from string literals (`"/users"`) as well as constants and variables (`USER_ROUTE`).
- **Automatic Status Codes:** Scans controller logic to automatically register response codes.
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

### 2. Request & Query via Type Assertion

If you don't use generics, the generator detects type assertions (`as Type`) on `req.body` and `req.query` within the function body.

```typescript
router.put("/users/:id", (req, res) => {
  // Infers request body schema
  const payload = req.body as UpdateUser;

  // Infers query parameters
  const { filter } = req.query as UserSearchQuery;

  res.send("Updated");
});
```

### 3. Response Bodies & Status Codes

The analyzer scans the function body for response methods. It matches standard Express patterns to generate the `responses` object, **including the schema of the data sent back**.

```typescript
router.get("/admin", (req, res) => {
  if (!isAdmin) {
    return res.status(403).send(); // Adds '403: Forbidden' to spec
  }

  try {
    const user: UserProfile = await getUser();
    // Adds '200: OK' with schema generated from 'UserProfile'
    return res.status(200).json(user);
  } catch (e) {
    return res.sendStatus(500); // Adds '500: Internal Server Error'
  }
});
```

## Manual Overrides

You can control specific endpoint details using JSDoc (above the route) or inline `#swagger` comments (inside the handler).

### Inline Configuration (`#swagger`)

This is useful for adding tags or descriptions directly inside the handler logic, keeping related code together.

```typescript
// Works with imported handlers too!
router.post("/upload", (req, res) => {
  // #swagger.tags = ["File Operations"]
  // #swagger.summary = "Upload a file"
  // #swagger.description = "Accepts multipart/form-data."
  // #swagger.deprecated = true
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
2.  **Recursive Crawl:** It looks for `router.use()` calls. If a router is imported from another file, the analyzer jumps to that file, appending the path prefix.
3.  **Controller Navigation:** If a route handler is defined in a separate file (e.g., `import { handler } from './controllers'`), the analyzer jumps to that file to scan for logic and types.
4.  **Circular Safety:** It maintains a stack of visited files to handle circular dependencies gracefully.
5.  **AST Analysis:** inside every route handler:
    - It extracts JSDoc comments.
    - It scans the function body for `#swagger` comments.
    - It scans for `res.status`, `res.json`, and `res.send` calls to infer responses.
    - It analyzes `req` usage for type assertions.
6.  **Schema Generation:** When a TypeScript type is encountered, `SchemaBuilder` recursively generates a JSON schema, handling:
    - Primitive types & Dates
    - Arrays, Tuples, & Enums
    - Nested Objects
    - Union Types (`string | number` becomes `oneOf` / `enum`)
    - Intersection Types (`TypeA & TypeB` becomes `allOf`)

## License

MIT
