export interface IApiClientTokenRequest {
  clientId: string;
  clientSecret: string;
}

export enum Clinic {
  CLINICONE = "CLINICONE",
  CLINICTWO = "CLINICTWO",
}

export interface IPatient {
  id: string;
  firstName: string;
  lastName: string;
  clinic: Clinic;
}

export interface IApiClientTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}
