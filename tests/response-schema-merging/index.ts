import { Request, Response, Router } from "express";

const router = Router();

export interface IDog {
  breed: string;
}

export interface ICat {
  lives: number;
}

/**
 * Get pet (Union type test)
 */
async function getPet(req: Request, res: Response) {
  // #swagger.tags = ["Pets"]
  if (req.query.type === "dog") {
    const dog: IDog = { breed: "Pug" };
    return res.status(200).json(dog);
  }
  const cat: ICat = { lives: 9 };
  return res.status(200).json(cat);
}

/**
 * Get dogs (Deduplication test)
 */
async function getDogs(req: Request, res: Response) {
  // #swagger.tags = ["Pets"]
  const dog1: IDog = { breed: "Panda" };

  // First return
  if (req.query.early) {
    return res.status(200).json(dog1);
  }

  // Second return (same type)
  return res.status(200).json(dog1);
}

/**
 * Get mixed (Preserve typed over empty, regardless of order)
 * AST traversal typically finds the first return first, then the second.
 * We want to ensure that if a typed return is found, a subsequent empty return (ignored) doesn't overwrite it.
 */
async function getMixed(req: Request, res: Response) {
  // #swagger.tags = ["Pets"]
  const dog: IDog = { breed: "Lab" };

  if (req.query.exist) {
    // Typed return found first
    return res.status(200).json(dog);
  }

  // Empty return found second
  return res.status(200).json([]);
}

router.get("/pet", getPet);
router.get("/dogs", getDogs);
router.get("/mixed", getMixed);

export default router;
