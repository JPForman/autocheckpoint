import { z } from 'zod';

export const availabilitySlotSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(24 * 60 - 1),
    endMinute: z.number().int().min(1).max(24 * 60),
  })
  .refine((s) => s.endMinute > s.startMinute, { message: 'endMinute must be after startMinute' });

export const putAvailabilitySchema = z.object({
  employeeId: z.string().optional(),
  slots: z.array(availabilitySlotSchema),
});

export const listAvailabilityQuerySchema = z.object({
  employeeId: z.string().optional(),
});
