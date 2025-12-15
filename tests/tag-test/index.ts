import { Router } from "express";

import tagsInFunction from "./tags-in-function";
import tagsInline from "./tags-inline";

const router = Router();

router.use("/", tagsInFunction);
router.use("/", tagsInline);

export default router;
