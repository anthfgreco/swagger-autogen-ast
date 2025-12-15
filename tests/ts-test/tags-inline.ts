import { Request, Response, Router } from "express";

const router = Router();

router.post(
  "/inline-share-document",
  (
    request: Request<{}, {}, { documentId: string; userId: string }>,
    response: Response,
  ) => {
    // #swagger.tags = ["Inline Tag Handler Endpoint"]
    // #swagger.description = "Inline endpoint to share a document."

    if (!request.body.documentId || !request.body.userId) {
      return response
        .status(400)
        .json({ error: "Missing documentId or userId" });
    }

    return response.status(204).json();
  },
);

export default router;
