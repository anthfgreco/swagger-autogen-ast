import { Router } from "express";
const router = Router();

const DYNAMIC = "/:id";

router.get(DYNAMIC, (req, res) => res.send("dyn"));

export default router;
