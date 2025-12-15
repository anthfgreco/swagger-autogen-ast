import { Router } from "express";

const router = Router();

router.get("/indexExtension", (request, response) => {
  try {
    return response.status(200).json("Hello from index-extension");
  } catch (error) {
    return response.status(500).json("Internal Server Error");
  }
});

export default router;
