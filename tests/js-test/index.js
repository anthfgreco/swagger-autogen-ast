import { Router } from "express";
import a from "./a";
import b from "./b";
import c from "./c";

const router = Router();

router.use("/a", a);
router.use("/b", b);
router.use("/c", c);

export default router;
