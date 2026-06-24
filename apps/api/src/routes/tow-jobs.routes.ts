import { Router } from 'express';
import { TowJobStatus, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody } from '../middleware/validate.js';
import { AppError } from '../middleware/AppError.js';
import {
  createTowJobSchema,
  listTowJobsQuerySchema,
  patchTowJobSchema,
} from '../schemas/tow-job.schemas.js';

const router = Router();

router.use(authenticate);

const towJobInclude = {
  vehicle: {
    select: { id: true, make: true, model: true, year: true, licensePlate: true, vin: true },
  },
  customer: {
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} as const;

function serializeTowJob(j: {
  id: string;
  vehicleId: string | null;
  vehicleDesc: string | null;
  customerId: string | null;
  createdById: string;
  status: TowJobStatus;
  notes: string | null;
  pickupLat: number;
  pickupLng: number;
  pickupLabel: string | null;
  destinationLat: number;
  destinationLng: number;
  destinationLabel: string | null;
  currentLat: number | null;
  currentLng: number | null;
  currentUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  vehicle?: { id: string; make: string; model: string; year: number; licensePlate: string | null; vin: string | null } | null;
  customer?: { id: string; firstName: string; lastName: string; email: string; phone: string | null } | null;
  createdBy?: { id: string; firstName: string; lastName: string; email: string };
}) {
  return {
    id: j.id,
    vehicleId: j.vehicleId,
    vehicleDesc: j.vehicleDesc,
    customerId: j.customerId,
    createdById: j.createdById,
    status: j.status,
    notes: j.notes,
    pickupLat: j.pickupLat,
    pickupLng: j.pickupLng,
    pickupLabel: j.pickupLabel,
    destinationLat: j.destinationLat,
    destinationLng: j.destinationLng,
    destinationLabel: j.destinationLabel,
    currentLat: j.currentLat,
    currentLng: j.currentLng,
    currentUpdatedAt: j.currentUpdatedAt?.toISOString() ?? null,
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
    vehicle: j.vehicle ?? null,
    customer: j.customer ?? null,
    createdBy: j.createdBy,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const parsed = listTowJobsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    const { status, customerId } = parsed.data;
    const isStaff = req.user!.role === UserRole.EMPLOYEE || req.user!.role === UserRole.ADMIN;

    const list = await prisma.towJob.findMany({
      where: {
        ...(isStaff ? {} : { customerId: req.user!.id }),
        ...(status ? { status } : {}),
        ...(isStaff && customerId ? { customerId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: towJobInclude,
    });
    res.json({ towJobs: list.map(serializeTowJob) });
  } catch (e) {
    next(e);
  }
});

// Staff-only vehicle lookup — must be before /:id
router.get(
  '/vehicles',
  requireRole(UserRole.EMPLOYEE, UserRole.ADMIN),
  async (_req, res, next) => {
    try {
      const vehicles = await prisma.vehicle.findMany({
        select: {
          id: true,
          make: true,
          model: true,
          year: true,
          licensePlate: true,
          vin: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: [{ make: 'asc' }, { model: 'asc' }],
      });
      res.json({ vehicles });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/',
  requireRole(UserRole.EMPLOYEE, UserRole.ADMIN),
  validateBody(createTowJobSchema),
  async (req, res, next) => {
    try {
      const { vehicleId, vehicleDesc, customerId, notes, pickupLat, pickupLng, pickupLabel, destinationLat, destinationLng, destinationLabel } = req.body;

      if (vehicleId) {
        const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
        if (!vehicle) throw new AppError(404, 'NOT_FOUND', 'Vehicle not found');
      }

      if (customerId) {
        const customer = await prisma.user.findFirst({ where: { id: customerId, role: UserRole.CUSTOMER } });
        if (!customer) throw new AppError(400, 'VALIDATION_ERROR', 'Customer not found');
      }

      const created = await prisma.towJob.create({
        data: {
          vehicleId: vehicleId ?? null,
          vehicleDesc: vehicleDesc ?? null,
          customerId: customerId ?? null,
          createdById: req.user!.id,
          notes: notes ?? null,
          pickupLat,
          pickupLng,
          pickupLabel: pickupLabel ?? null,
          destinationLat,
          destinationLng,
          destinationLabel: destinationLabel ?? null,
        },
        include: towJobInclude,
      });
      res.status(201).json({ towJob: serializeTowJob(created) });
    } catch (e) {
      next(e);
    }
  },
);

router.get('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const isStaff = req.user!.role === UserRole.EMPLOYEE || req.user!.role === UserRole.ADMIN;
    const job = await prisma.towJob.findFirst({
      where: {
        id,
        ...(isStaff ? {} : { customerId: req.user!.id }),
      },
      include: towJobInclude,
    });
    if (!job) throw new AppError(404, 'NOT_FOUND', 'Tow job not found');
    res.json({ towJob: serializeTowJob(job) });
  } catch (e) {
    next(e);
  }
});

router.patch(
  '/:id',
  requireRole(UserRole.EMPLOYEE, UserRole.ADMIN),
  validateBody(patchTowJobSchema),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const job = await prisma.towJob.findUnique({ where: { id } });
      if (!job) throw new AppError(404, 'NOT_FOUND', 'Tow job not found');

      const body = req.body as Record<string, unknown>;

      const hasLat = body.currentLat !== undefined;
      const hasLng = body.currentLng !== undefined;
      if (hasLat !== hasLng) {
        throw new AppError(400, 'VALIDATION_ERROR', 'currentLat and currentLng must be set together');
      }

      const updatingLocation = hasLat && hasLng && body.currentLat !== null;

      const updated = await prisma.towJob.update({
        where: { id },
        data: {
          ...(body.status !== undefined ? { status: body.status as TowJobStatus } : {}),
          ...(body.notes !== undefined ? { notes: body.notes as string | null } : {}),
          ...(body.pickupLat !== undefined ? { pickupLat: body.pickupLat as number } : {}),
          ...(body.pickupLng !== undefined ? { pickupLng: body.pickupLng as number } : {}),
          ...(body.pickupLabel !== undefined ? { pickupLabel: body.pickupLabel as string | null } : {}),
          ...(body.destinationLat !== undefined ? { destinationLat: body.destinationLat as number } : {}),
          ...(body.destinationLng !== undefined ? { destinationLng: body.destinationLng as number } : {}),
          ...(body.destinationLabel !== undefined ? { destinationLabel: body.destinationLabel as string | null } : {}),
          ...(hasLat ? { currentLat: body.currentLat as number | null } : {}),
          ...(hasLng ? { currentLng: body.currentLng as number | null } : {}),
          ...(updatingLocation ? { currentUpdatedAt: new Date() } : {}),
          ...(!updatingLocation && hasLat ? { currentUpdatedAt: null } : {}),
        },
        include: towJobInclude,
      });
      res.json({ towJob: serializeTowJob(updated) });
    } catch (e) {
      next(e);
    }
  },
);

router.delete(
  '/:id',
  requireRole(UserRole.EMPLOYEE, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const job = await prisma.towJob.findUnique({ where: { id } });
      if (!job) throw new AppError(404, 'NOT_FOUND', 'Tow job not found');
      if (job.status !== TowJobStatus.PENDING && job.status !== TowJobStatus.CANCELED) {
        throw new AppError(409, 'CONFLICT', 'Can only delete PENDING or CANCELED tow jobs');
      }
      await prisma.towJob.delete({ where: { id } });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
);

export default router;
