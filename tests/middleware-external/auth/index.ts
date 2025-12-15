import { Router } from "express";
import { authMiddleware } from "./middleware";

const router = Router();

router.get("/external-auth", authMiddleware, (req, res) => {
  res.json({ ok: true });
});

export default router;
