import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';

export const createAppointmentSchema = z.object({
  vehicleId: z.string().min(1),
  startsAt: z.coerce.date(),
  serviceType: z.string().min(1).max(200),
  customerNotes: z.string().max(2000).optional(),
  assignedEmployeeId: z.string().optional(),
});

export const listAppointmentsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
});

export const patchAppointmentSchema = z
  .object({
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    status: z.nativeEnum(AppointmentStatus).optional(),
    notes: z.string().max(5000).nullable().optional(),
    customerNotes: z.string().max(2000).nullable().optional(),
    assignedEmployeeId: z.string().nullable().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: 'At least one field required' });
