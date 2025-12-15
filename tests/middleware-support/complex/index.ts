import { Router } from "express";

const router = Router();

function validationMiddleware(req: any, res: any, next: any) {
  if (!req.query || !req.query.q) return res.sendStatus(400);
  next();
}

function authMiddleware(req: any, res: any, next: any) {
  if (!req.headers["x-auth"]) return res.sendStatus(403);
  next();
}

router.post("/mw-complex", validationMiddleware, authMiddleware, (req, res) => {
  res.status(201).json({ created: true });
});

export default router;
