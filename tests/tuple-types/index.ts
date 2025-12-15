import { Request, Response, Router } from "express";

const router = Router();

interface Coordinates {
  point: [number, number];
  tags: [string, number, boolean];
}

router.post("/tuple", (req: Request<{}, {}, Coordinates>, res: Response) => {
  res.send();
});

export default router;
