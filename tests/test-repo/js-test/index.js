import { Router } from "express";
import a from "./a";
import b from "./b";

const router = Router();

router.use("/a", a);
router.use("/b", b);

export default router;
