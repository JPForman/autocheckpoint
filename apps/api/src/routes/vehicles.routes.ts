import { Router } from 'express';
import { AppointmentStatus, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody } from '../middleware/validate.js';
import { AppError } from '../middleware/AppError.js';
import { createVehicleSchema, updateVehicleSchema } from '../schemas/vehicle.schemas.js';

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.CUSTOMER));

router.get('/', async (req, res, next) => {
  try {
    const list = await prisma.vehicle.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ vehicles: list });
  } catch (e) {
    next(e);
  }
});

router.post('/', validateBody(createVehicleSchema), async (req, res, next) => {
  try {
    const v = await prisma.vehicle.create({
      data: { ...req.body, userId: req.user!.id },
    });
    res.status(201).json({ vehicle: v });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', validateBody(updateVehicleSchema), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.vehicle.findFirst({
      where: { id, userId: req.user!.id },
    });
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Vehicle not found');
    }
    const v = await prisma.vehicle.update({
      where: { id: existing.id },
      data: req.body,
    });
    res.json({ vehicle: v });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.vehicle.findFirst({
      where: { id, userId: req.user!.id },
    });
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Vehicle not found');
    }
    const appt = await prisma.appointment.findFirst({
      where: {
        vehicleId: existing.id,
        status: { notIn: [AppointmentStatus.CANCELED] },
      },
    });
    if (appt) {
      throw new AppError(
        409,
        'CONFLICT',
        'Cannot delete vehicle with active or past scheduled appointments',
      );
    }
    await prisma.vehicle.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
