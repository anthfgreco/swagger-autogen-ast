/** Request body for client token endpoint. */
export interface IApiClientTokenRequest {
  /** The client ID issued to the partner. */
  clientId: string;
  /** The secret key issued to the partner. */
  clientSecret: string;
}

/** Response body for client token endpoint. */
export interface IApiClientTokenResponse {
  /** The JWT access token. */
  accessToken: string;
  /** Token type, always "Bearer". */
  tokenType: string;
  /** Token lifetime in seconds. */
  expiresIn: number;
  /** ISO timestamp when the token was issued. */
  issuedAt: string;
  /** ISO timestamp when the token expires. */
  expiresAt: string;
}

export enum ClinicInterface {
  CLINICONE = "CLINICONE",
  CLINICTWO = "CLINICTWO",
}

export interface IUser {
  id: string;
  firstName: string;
  lastName: string;
  mainParentClinicId: ClinicInterface;
}
