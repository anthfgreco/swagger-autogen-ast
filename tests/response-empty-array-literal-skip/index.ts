import { Request, Response, Router } from "express";

const router = Router();

export interface IUser {
  id: string;
  name: string;
  email: string;
}

/**
 * Get users.
 */
async function getUsers(request: Request, response: Response) {
  // #swagger.tags = ["Users"]
  // #swagger.summary = "Get users"

  const users: IUser[] = [
    { id: "1", name: "Alice", email: "alice@example.com" },
    { id: "2", name: "Bob", email: "bob@example.com" },
  ];

  // Simulating a condition where we return an empty untyped array early
  if (request.query.returnEmpty) {
    // This empty array literal should be skipped by the inference engine
    return response.status(200).json([]);
  }

  // This typed array should dictate the schema
  return response.status(200).json(users);
}

router.get("/users", getUsers);

export default router;
