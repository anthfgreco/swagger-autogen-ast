import { Request, Response, Router } from "express";

const router = Router();

interface User {
  id: number;
  name: string;
  role: "admin" | "user";
  tags: string[];
  metadata: {
    lastLogin: string;
    ip: string;
  };
}

type AdminUser = User & { permissions: string[] };

router.post("/user", (req: Request<{}, {}, User>, res: Response) => {
  res.status(200).send();
});

router.post("/admin", (req: Request<{}, {}, AdminUser>, res: Response) => {
  res.status(200).send();
});

export default router;
