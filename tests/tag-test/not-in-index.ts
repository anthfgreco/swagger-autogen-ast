// not-in-index.ts
// intentionally left out of index.ts
// should only be included if generateOpenApi directly references it

import { Router } from "express";

const router = Router();

router.get("/not-in-index", (request, response) => {
  try {
    return response.status(200).json("Hello from not-in-index");
  } catch (error) {
    return response.status(500).json("Internal Server Error");
  }
});

export default router;
