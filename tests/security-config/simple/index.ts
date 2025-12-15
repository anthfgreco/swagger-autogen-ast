import { Router } from "express";

const router = Router();

router.get("/secure-simple", (req, res) => {
  // #swagger.security = [{ "bearerAuth": [] }]
  res.json({ ok: true });
});

export default router;
