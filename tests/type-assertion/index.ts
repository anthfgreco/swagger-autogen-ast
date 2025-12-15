import { Request, Response, Router } from "express";

const router = Router();

interface UpdateUser {
  username?: string;
  email?: string;
}

router.put("/users/:id", (req: Request, res: Response) => {
  // The generator should see this cast and apply 'UpdateUser' as the request body schema
  const payload = req.body as UpdateUser;

  res.send("Updated");
});

export default router;
