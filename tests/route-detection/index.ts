import { Router } from "express";
import subRouter from "./routes";

const router = Router();

router.use("/api/v1", subRouter);

router.get("/health", (req, res) => {
  res.send("OK");
});

export default router;
