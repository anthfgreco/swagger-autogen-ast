import { Request, Response } from "express";

/**
 * @summary Cross File Handler
 * @description Handler defined in another file
 * @tags CrossFile
 */
export function createUser(req: Request, res: Response) {
  // #swagger.tags = ["CrossFileSwagger"]
  // Type assertion example
  const body = req.body as { username: string; email: string };

  res.status(201).send(body);
}
