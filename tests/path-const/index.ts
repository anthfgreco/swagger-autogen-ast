import { Router } from "express";
const router = Router();

const USER_PATH = "/users";

// This should be resolved to a literal path by the generator
router.get(USER_PATH, (req, res) => res.send("users"));

export default router;
