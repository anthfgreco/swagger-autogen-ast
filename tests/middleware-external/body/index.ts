import { Router } from "express";
import { ensureBody } from "./middleware";

const router = Router();

router.post("/external-body", ensureBody, (req, res) => {
  res.status(201).json({ created: true });
});

export default router;
