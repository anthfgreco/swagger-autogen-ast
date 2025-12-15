import { Router } from "express";

const router = Router();

router.get("/prog-secure", (req, res) => {
  res.json({ ok: true });
});

export default router;
