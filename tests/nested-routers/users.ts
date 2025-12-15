import { Router } from "express";

const router = Router();

router.get("/:id", (req, res) => {
  res.send("User details");
});

router.get("/", (req, res) => {
  res.send("List users");
});

export default router;
