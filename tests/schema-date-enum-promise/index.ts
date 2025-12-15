import { Request, Response, Router } from "express";
const router = Router();

export enum Role {
  Admin = "admin",
  User = "user",
}

interface User {
  id: number;
  name: string;
  role: Role;
  createdAt: Date;
}

// Body uses Date and Enum
router.post("/user-schema", (req: Request<{}, {}, User>, res: Response) => {
  res.send();
});

export default router;
