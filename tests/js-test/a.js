import { Router } from "express";
import b from "./b";

const router = Router();

router.get("/hello-from-a", (req, res) => {
  // #swagger.tags = ["A Handler Endpoint"]
  // #swagger.description = "A File Description"

  res.send("Hello from A");
});
router.use("/b", b);

export default router;
