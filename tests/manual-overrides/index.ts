import { Router } from "express";

const router = Router();

router.post("/upload", (req, res) => {
  // #swagger.tags = ["File Operations"]
  // #swagger.summary = "Upload a file"
  // #swagger.description = "Accepts multipart/form-data."
  // #swagger.deprecated = true
  // #swagger.operationId = "uploadFileHandler"
  // #swagger.responses.201.description = "File Created"

  res.status(200).send();
});

export default router;
