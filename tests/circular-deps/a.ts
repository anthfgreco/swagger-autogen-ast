import { Router } from "express";
import bRouter from "./b";

const router = Router();

router.get("/hello", (req, res) => res.send("Hello from A"));
router.use("/b", bRouter);

export default router;
