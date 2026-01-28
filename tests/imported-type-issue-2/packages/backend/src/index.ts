import {
  Clinic,
  IApiClientTokenRequest,
  IApiClientTokenResponse,
  IPatient,
} from "common";
import { Request, Response, Router } from "express";

const router = Router();

router.post("/auth/token", (request: Request, response: Response) => {
  const { clientId, clientSecret } = request.body as IApiClientTokenRequest;

  if (!clientId || !clientSecret) {
    return response.status(400).json({ error: "Missing credentials" });
  }

  const tokenResponse = {
    accessToken: "abc",
    tokenType: "Bearer",
    expiresIn: 3600,
  } as IApiClientTokenResponse;

  return response.json(tokenResponse);
});

router.get("/patient", (request: Request, response: Response) => {
  const patient: IPatient = {
    id: "1",
    firstName: "John",
    lastName: "Doe",
    clinic: Clinic.CLINICONE,
  };
  response.json(patient);
});

export default router;
