import { Router } from "express";
import a from "./a";
import b from "./b";
import tagsInFunction from "./tags-in-function";

const router = Router();

router.use("/a", a);
router.use("/b", b);
router.use("/tagsInFunction", tagsInFunction);

export default router;
