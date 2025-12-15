import { Router } from "express";
import { createUser } from "./controller";

const router = Router();

router.post("/create", createUser);

export default router;
