import { Router } from "express";

// Exported helper function with swagger comments should not create paths
export function notARouter() {
  // #swagger.tags = ["NotARoute"]
  return null;
}

// A normal router after helper
const router = Router();

router.post("/ok", (req, res) => res.send("ok"));

export default router;
