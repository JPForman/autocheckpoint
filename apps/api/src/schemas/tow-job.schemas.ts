import { z } from 'zod';
import { TowJobStatus } from '@prisma/client';

export const createTowJobSchema = z
  .object({
    vehicleId:        z.string().cuid().optional(),
    vehicleDesc:      z.string().min(1).max(500).optional(),
    customerId:       z.string().cuid().optional(),
    notes:            z.string().max(5000).optional(),
    pickupLat:        z.number().min(-90).max(90),
    pickupLng:        z.number().min(-180).max(180),
    pickupLabel:      z.string().max(200).optional(),
    destinationLat:   z.number().min(-90).max(90),
    destinationLng:   z.number().min(-180).max(180),
    destinationLabel: z.string().max(200).optional(),
  })
  .refine((d) => d.vehicleId || d.vehicleDesc, {
    message: 'Either vehicleId or vehicleDesc is required',
    path: ['vehicleId'],
  });

export const patchTowJobSchema = z
  .object({
    status:           z.nativeEnum(TowJobStatus).optional(),
    notes:            z.string().max(5000).nullable().optional(),
    pickupLat:        z.number().min(-90).max(90).optional(),
    pickupLng:        z.number().min(-180).max(180).optional(),
    pickupLabel:      z.string().max(200).nullable().optional(),
    destinationLat:   z.number().min(-90).max(90).optional(),
    destinationLng:   z.number().min(-180).max(180).optional(),
    destinationLabel: z.string().max(200).nullable().optional(),
    currentLat:       z.number().min(-90).max(90).nullable().optional(),
    currentLng:       z.number().min(-180).max(180).nullable().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: 'At least one field required' });

export const listTowJobsQuerySchema = z.object({
  status:     z.nativeEnum(TowJobStatus).optional(),
  customerId: z.string().optional(),
});
