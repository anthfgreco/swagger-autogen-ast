import { Request, Response, Router } from "express";

const router = Router();

interface UserQuery {
  includeProfile?: string;
  sortBy?: "date" | "name";
  limit?: number; // Note: Express query params are usually strings, but let's see how it handles types
}

// 3rd is Body (empty), 4th is Query
router.get("/users", (req: Request<{}, {}, {}, UserQuery>, res: Response) => {
  res.json([]);
});

export default router;
