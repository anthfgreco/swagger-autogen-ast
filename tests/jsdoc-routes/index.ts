import { Router } from "express";

const router = Router();

/**
 * @summary Get User
 * @description Fetch a user by their unique ID
 * @tags Users, Public
 * @deprecated
 * @operationId getUserById
 */
router.get("/user/:id", (req, res) => {
  res.send("User");
});

export default router;
