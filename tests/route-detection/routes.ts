import { Router } from "express";

const router = Router();

router.get("/:id", (req, res) => {
  res.send("Get by ID");
});

router.put("/update", (req, res) => {
  res.send("Update");
});

export default router;
