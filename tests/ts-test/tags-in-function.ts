import { Request, Response, Router } from "express";

const router = Router();

router.post("/share-document", shareDocument);

async function shareDocument(
  request: Request<{}, {}, { documentId: string; userId: string }>,
  response: Response,
) {
  // #swagger.tags = ["Tag Handler Endpoint"]
  // #swagger.description = "Endpoint to share a document."

  if (!request.body.documentId || !request.body.userId) {
    return response.status(400).send();
  }

  return response.status(204).send();
}

export default router;
