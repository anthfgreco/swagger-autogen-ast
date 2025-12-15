import { Router } from "express";
import aRouter from "./a";

const router = Router();

router.get("/hello", (req, res) => res.send("Hello from B"));

// Circular reference back to A
// The crawler should detect this and stop recursion for this branch
router.use("/a-again", aRouter);

export default router;
