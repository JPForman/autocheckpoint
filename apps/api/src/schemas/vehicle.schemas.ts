import { z } from 'zod';

export const createVehicleSchema = z.object({
  make: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
  vin: z.string().max(32).optional(),
  licensePlate: z.string().max(20).optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();
