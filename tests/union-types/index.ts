import { Request, Response, Router } from "express";

const router = Router();

interface StringOrNumber {
  value: string | number;
}

interface ObjectUnion {
  item: { type: "a"; a: string } | { type: "b"; b: number };
}

router.post("/union", (req: Request<{}, {}, StringOrNumber>, res: Response) => {
  res.send();
});

router.post(
  "/object-union",
  (req: Request<{}, {}, ObjectUnion>, res: Response) => {
    res.send();
  },
);

export default router;
