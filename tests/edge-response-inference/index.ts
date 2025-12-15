import { Router, Request, Response } from "express";
const router = Router();

interface User {
  id: number;
  name: string;
}

router.get("/resp", async (req: Request, res: Response) => {
  const user: User = { id: 1, name: "A" };
  // response returned via res.json should create a 200 response and ideally a schema
  return res.json(user);
});

export default router;
