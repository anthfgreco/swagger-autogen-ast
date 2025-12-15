import { Router, Request, Response } from "express";

const router = Router();

interface Primitives {
  nothing: void;
  unknown: any;
  missing: undefined;
  empty: null;
}

router.post("/primitives", (req: Request<{}, {}, Primitives>, res: Response) => {
  res.send();
});

export default router;
