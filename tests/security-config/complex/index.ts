import { Router } from "express";

const router = Router();

router.post("/secure-complex", (req, res) => {
  // multiple security requirements
  // #swagger.security = [{ "bearerAuth": [] }, { "apiKeyAuth": [] }]
  const token = req.header("Authorization");
  if (!token) return res.sendStatus(401);
  res.status(201).json({ created: true });
});

export default router;
