# swagger-autogen-ast

A zero-config OpenAPI 3.0 generator for Express. The AST-based spiritual successor to `swagger-autogen` with automatic type inference.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

## Overview

**swagger-autogen-ast** automates the creation of OpenAPI 3.0 specifications by statically analyzing your TypeScript source code.

This library uses the **TypeScript Compiler API (AST)** to understand your code structure. It automatically infers request bodies, query parameters, and response schemas directly from your TypeScript interfaces and type definitions, reducing the need for manual documentation tags.

## Features

- **AST-Powered Analysis:** accurate route detection that understands code structure, imports, and variable declarations.
- **Automatic Schema Inference:** converts TypeScript Interfaces, Enums, Unions, and Intersections into OpenAPI Schemas automatically.
- **Zero-Config Parameter Detection:** detects path parameters (`:id`), query parameters (destructuring or `req.query`), request bodies (`req.body`), and casting (`req.body as Type`).
- **JSDoc & Comment Support:** fully supports JSDoc tags and `#swagger` inline comments for manual overrides.
- **Express.js Support:** native support for Express routers and middleware patterns.

## Installation

**Note**: Not published to npm yet!

```bash
npm install swagger-autogen-ast --save-dev
```

## Quick Start

Create a generator script (e.g., `swagger.ts`) in your project root:

```typescript
import { generateOpenApi } from "swagger-autogen-ast";
import path from "path";

const options = {
  entryFile: "./src/app.ts",
  outputFile: "./swagger.json",
  tsconfigPath: "./tsconfig.json",
  info: {
    title: "My API",
    version: "1.0.0",
    description: "Generated via AST analysis",
  },
  servers: [{ url: "http://localhost:3000", description: "Local server" }],
};

generateOpenApi(options);
```

Run the script:

```bash
npx ts-node swagger.ts
```

## Automatic Inference

The primary advantage of this library is minimizing documentation overhead. It infers specifications from your existing code.

### 1. Request Body Inference

If you cast `req.body` or use a generic `Request` type, the library generates the schema for you.

```typescript
interface UserCreate {
  name: string;
  email: string;
  roles: "admin" | "user";
}

// The generator detects 'UserCreate' and builds the requestBody schema
app.post("/users", (req, res) => {
  const body = req.body as UserCreate;
  // ...
});
```

### 2. Query Parameter Inference

Destructuring `req.query` automatically registers query parameters.

```typescript
// Registers 'startDate' and 'endDate' as query parameters automatically
app.get("/analytics", (req, res) => {
  const { startDate, endDate } = req.query;
  // ...
});
```

## Manual Overrides

You can control specific endpoint details using JSDoc (above the route) or inline `#swagger` comments (inside the handler).

### JSDoc Support

Standard JSDoc tags placed above the route definition are parsed.

```typescript
/**
 * @summary Create a new patient
 * @description Adds a patient to the database and sends a welcome email.
 * @tags Patients, Onboarding
 * @deprecated
 */
router.post("/patient", handler);
```

### Inline Comments

For fine-grained control and to group endpoints by tags, use `#swagger` comments within your function body.

```typescript
router.get("/user/:id", (req, res) => {
  // #swagger.tags = ["Users"]
  // #swagger.summary = "Get user by ID"
  // #swagger.description = "Retrieves a user from the database using their unique ID."

  res.send(user);
});
```

## License

MIT © Anthony Greco
