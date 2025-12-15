import { Router } from "express";
import aRouter from "./a";

const router = Router();

router.use("/a", aRouter);

export default router;
