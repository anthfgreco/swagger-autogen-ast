import { Router } from "express";

const router = Router();

// This utility contains a #swagger tag, but it's not inside a route handler
export function helper() {
  // #swagger.tags = ["ShouldNotApply"]
  return true;
}

router.get("/util-route", (req, res) => {
  res.send("OK");
});

export default router;
