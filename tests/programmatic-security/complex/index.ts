import { Router } from "express";
import apiKeyMiddleware from "./middleware";

const router = Router();

router.get("/prog-secure-ext", apiKeyMiddleware, (req, res) => {
  res.json({ ok: true });
});

export default router;
