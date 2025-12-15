import { Router } from "express";
import a from "./a";
import b from "./b";
import c from "./c";
import indexExtension from "./index-extension";

const router = Router();

router.use("/a", a);
router.use("/b", b);
router.use("/c", c);
router.use("/", indexExtension);

export default router;
