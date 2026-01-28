import { IApiClientTokenRequest } from "common";
import { Request, Response, Router } from "express";

const router = Router();

router.post("/auth/token", (req: Request, res: Response) => {
  const { clientId, clientSecret } = req.body as IApiClientTokenRequest;
  res.json({ token: "123" });
});

export default router;
