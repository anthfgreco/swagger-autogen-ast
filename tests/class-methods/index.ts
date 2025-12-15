import { Router, Request, Response } from "express";

const router = Router();

class UserDTO {
  name: string;
  age: number;

  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }

  getFullName() {
    return this.name;
  }

  save() {
    console.log("Saving");
  }
}

router.post("/class", (req: Request<{}, {}, UserDTO>, res: Response) => {
  res.send();
});

export default router;
