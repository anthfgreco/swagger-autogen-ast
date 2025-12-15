import { NextFunction, Request, Response } from "express";

export function ensureBody(req: Request, res: Response, next: NextFunction) {
  if (!req.body || Object.keys(req.body).length === 0)
    return res.sendStatus(400);
  next();
}

export default ensureBody;
