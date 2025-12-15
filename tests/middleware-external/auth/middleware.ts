import { NextFunction, Request, Response } from "express";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.header("Authorization") || req.headers["authorization"];
  if (!token) return res.sendStatus(401);
  next();
}

export default authMiddleware;
