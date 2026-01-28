import { Request, Response, Router } from "express";

const router = Router();

/** Subset of IAppointment for Clinic integration. */
export interface IClinicAppointment {
  id: string;
  patientId: string;
  patientFirstName: string;
  patientLastName: string;
  startAt: string;
  durationMins: number;
  serviceName: string;
  status: string;
}

/**
 * Get appointment details.
 */
async function getAppointments(request: Request, response: Response) {
  // #swagger.tags = ["Clinic"]
  // #swagger.summary = "Get appointments"

  try {
    const appointments: any[] = []; // Mocked

    const clinicAppointments: IClinicAppointment[] = [];

    for (const appointment of appointments) {
      clinicAppointments.push({
        id: appointment.id,
        patientId: appointment.patientId,
        patientFirstName: appointment.firstName,
        patientLastName: appointment.lastName,
        startAt: appointment.startAt,
        durationMins: appointment.durationMins,
        serviceName: appointment.serviceName,
        status: appointment.status || "",
      });
    }

    return response.status(200).json(clinicAppointments);
  } catch (error) {
    return response.status(500).json({ error: "Internal Server Error" });
  }
}

router.get("/appointments", getAppointments);

export default router;
