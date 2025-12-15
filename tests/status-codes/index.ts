import { Router } from "express";

const router = Router();

router.get("/status-check", (req, res) => {
  if (req.query.error) {
    return res.status(400).send("Bad Request");
  }

  try {
    if (req.query.unauth) {
      return res.sendStatus(401);
    }
    res.status(200).json({ status: "ok" });
  } catch (e) {
    res.status(500).send("Error");
  }
});

export default router;
