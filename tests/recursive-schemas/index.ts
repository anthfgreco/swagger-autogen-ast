import { Request, Response, Router } from "express";

const router = Router();

interface Comment {
  id: number;
  text: string;
  author: string;
  replies: Comment[]; // Recursive reference
}

router.post("/comments", (req: Request<{}, {}, Comment>, res: Response) => {
  res.status(201).send();
});

export default router;
