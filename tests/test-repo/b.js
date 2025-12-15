import { Router } from "express";
import a from "./a";

const router = Router();

router.get("/hello-from-b", (req, res) => res.send("Hello from B"));
router.use("/a", a);

export default router;
