import { Router } from "express";

const router = Router();

router.get("/header-simple", (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) return res.sendStatus(401);
  res.send("ok");
});

export default router;
