import { Router } from "express";
const router = Router();

// Empty handler (no body) but still a function. Ensure no requestBody.
router.get("/no-body", function () {});

export default router;
