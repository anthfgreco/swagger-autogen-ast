import { Router } from "express";

const router = Router();

function authMiddleware(req: any, res: any, next: any) {
  if (!req.headers["x-auth"]) return res.sendStatus(403);
  next();
}

router.get("/mw-simple", authMiddleware, (req, res) => {
  res.json({ ok: true });
});

export default router;
