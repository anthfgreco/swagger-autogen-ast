import { Router } from "express";
const router = Router();

const DYNAMIC = "/:id";

// non-literal path (variable) should be treated as dynamic/unknown
router.get(DYNAMIC, (req, res) => res.send("dyn"));

export default router;
