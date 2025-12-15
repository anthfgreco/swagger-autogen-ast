import { NextFunction, Request, Response } from "express";

// This middleware declares an additional security requirement
export function apiKeyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // #swagger.security = [{ "apiKeyAuth": [] }]

  // middleware logic (no-op for tests)
  next();
}

export default apiKeyMiddleware;
