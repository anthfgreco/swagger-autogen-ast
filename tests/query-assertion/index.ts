import { Router } from "express";
const router = Router();

interface SearchQuery {
  q?: string;
  page?: number;
}

router.get("/search", (req, res) => {
  const q = req.query as unknown as SearchQuery;
  res.send(q);
});

export default router;
