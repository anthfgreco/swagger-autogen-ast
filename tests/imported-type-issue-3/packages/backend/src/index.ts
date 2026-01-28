/**
 * External API Integration (Mock)
 * This file tests schema resolution for imported types.
 */

import {
  ClinicInterface,
  IApiClientTokenRequest,
  IApiClientTokenResponse,
  IUser,
} from "common";
import { Request, Response, Router } from "express";

const router = Router();

//////////////////////////////////////////////////////////////////////////////
// #region Endpoints
//////////////////////////////////////////////////////////////////////////////

router.post("/auth/token", exchangeCredentialsForToken);

router.get("/user", getUser);

//////////////////////////////////////////////////////////////////////////////
// #region Controllers
//////////////////////////////////////////////////////////////////////////////

async function exchangeCredentialsForToken(
  request: Request,
  response: Response,
) {
  // #swagger.tags = ["Auth"]

  const { clientId, clientSecret } = request.body as IApiClientTokenRequest;

  if (!clientId || !clientSecret) {
    response.status(400).json({
      error: "BAD_REQUEST",
      message: "Missing clientId or clientSecret.",
    });
    return;
  }

  const expiresInSeconds = 10800;
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + expiresInSeconds * 1000);

  const tokenResponse: IApiClientTokenResponse = {
    accessToken: "mock-token",
    tokenType: "Bearer",
    expiresIn: expiresInSeconds,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  response.json(tokenResponse);
}

async function getUser(request: Request, response: Response) {
  // #swagger.tags = ["Auth"]

  const { id } = request.query as {
    /** User ID. */
    id?: string;
  };

  if (!id) {
    return response.status(400).json({ error: "Missing 'id' query parameter" });
  }

  const user: IUser = {
    id: id,
    firstName: "John",
    lastName: "Doe",
    mainParentClinicId: ClinicInterface.CLINICONE,
  };

  return response.json(user);
}

export default router;
