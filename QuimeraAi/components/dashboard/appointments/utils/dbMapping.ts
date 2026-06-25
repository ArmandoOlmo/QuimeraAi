import type { Appointment } from '../../../../types';
import {
    mapAppointmentPatchToRow,
    mapAppointmentRowToAppointment,
} from '../../../../services/appointments/appointmentEngineService';

export const mapAppointmentFromDb = mapAppointmentRowToAppointment;

export const mapAppointmentToDb = (
    appointment: Partial<Appointment>,
    tenantId?: string,
    projectId?: string,
) => mapAppointmentPatchToRow(appointment, tenantId, projectId);
