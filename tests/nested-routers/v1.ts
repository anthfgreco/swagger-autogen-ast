import { Router } from "express";
import usersRouter from "./users";

const router = Router();

router.use("/users", usersRouter);

export default router;
