import { Router } from "express";

const router = Router();

router.get("/header-complex", (req, res) => {
  const auth = req.header("Authorization");
  const corr = req.headers["x-correlation-id"];
  if (!auth) return res.sendStatus(401);
  res.json({ ok: true, correlation: corr });
});

export default router;
