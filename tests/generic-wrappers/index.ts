import { Request, Response, Router } from "express";

const router = Router();

interface Envelope<T> {
  data: T;
  meta: {
    timestamp: number;
    version: string;
  };
  success: boolean;
}

interface User {
  name: string;
  email: string;
}

// Generic usage
router.post("/user", (req: Request<{}, {}, Envelope<User>>, res: Response) => {
  res.status(200).send();
});

export default router;
