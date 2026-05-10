import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { AppointmentStatus, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';
import { AppError } from '../middleware/AppError.js';
import {
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  patchAppointmentSchema,
} from '../schemas/appointment.schemas.js';
import { employeeCoversSlot, hasSchedulingConflict } from '../lib/appointmentHelpers.js';

const router = Router();

router.use(authenticate);

function assertCustomerChangeWindow(startsAt: Date) {
  const minMs = env.APPOINTMENT_CHANGE_MIN_HOURS * 3_600_000;
  if (startsAt.getTime() - Date.now() < minMs) {
    throw new AppError(
      403,
      'FORBIDDEN',
      `Changes must be made at least ${env.APPOINTMENT_CHANGE_MIN_HOURS} hours before the appointment start time`,
    );
  }
}

function serializeAppointment(a: {
  id: string;
  customerId: string;
  vehicleId: string;
  startsAt: Date;
  endsAt: Date;
  serviceType: string;
  status: AppointmentStatus;
  notes: string | null;
  customerNotes: string | null;
  assignedEmployeeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
    vin: string | null;
    licensePlate: string | null;
  };
  assignedEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}) {
  return {
    id: a.id,
    customerId: a.customerId,
    vehicleId: a.vehicleId,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    serviceType: a.serviceType,
    status: a.status,
    notes: a.notes,
    customerNotes: a.customerNotes,
    assignedEmployeeId: a.assignedEmployeeId,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    customer: a.customer,
    vehicle: a.vehicle,
    assignedEmployee: a.assignedEmployee,
  };
}

const appointmentInclude = {
  customer: {
    select: { id: true, email: true, firstName: true, lastName: true, phone: true },
  },
  vehicle: {
    select: { id: true, make: true, model: true, year: true, vin: true, licensePlate: true },
  },
  assignedEmployee: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} as const;

router.get('/', async (req, res, next) => {
  try {
    const parsed = listAppointmentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    const { from, to, status } = parsed.data;
    const isStaff = req.user!.role === UserRole.EMPLOYEE || req.user!.role === UserRole.ADMIN;

    const where: Prisma.AppointmentWhereInput = {
      ...(isStaff ? {} : { customerId: req.user!.id }),
      ...(from || to
        ? {
            startsAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(status ? { status } : {}),
    };

    const list = await prisma.appointment.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: appointmentInclude,
    });
    res.json({ appointments: list.map(serializeAppointment) });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/',
  validateBody(createAppointmentSchema),
  async (req, res, next) => {
    try {
      if (req.user!.role !== UserRole.CUSTOMER) {
        throw new AppError(403, 'FORBIDDEN', 'Only customers can book appointments');
      }

      const { vehicleId, startsAt, serviceType, customerNotes, assignedEmployeeId } = req.body;

      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, userId: req.user!.id },
      });
      if (!vehicle) {
        throw new AppError(404, 'NOT_FOUND', 'Vehicle not found');
      }

      if (startsAt.getTime() <= Date.now()) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Appointment must be in the future');
      }

      const durationMs = env.DEFAULT_APPOINTMENT_DURATION_MINUTES * 60_000;
      const endsAt = new Date(startsAt.getTime() + durationMs);

      if (await hasSchedulingConflict(startsAt, endsAt)) {
        throw new AppError(409, 'CONFLICT', 'This time slot conflicts with an existing appointment');
      }

      if (assignedEmployeeId) {
        const emp = await prisma.user.findFirst({
          where: { id: assignedEmployeeId, role: UserRole.EMPLOYEE },
        });
        if (!emp) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Invalid assigned employee');
        }
        const ok = await employeeCoversSlot(assignedEmployeeId, startsAt, endsAt);
        if (!ok) {
          throw new AppError(
            400,
            'VALIDATION_ERROR',
            'Requested time is outside the assigned employee availability (UTC)',
          );
        }
      }

      const created = await prisma.appointment.create({
        data: {
          customerId: req.user!.id,
          vehicleId,
          startsAt,
          endsAt,
          serviceType,
          customerNotes,
          assignedEmployeeId: assignedEmployeeId ?? null,
        },
        include: appointmentInclude,
      });
      res.status(201).json({ appointment: serializeAppointment(created) });
    } catch (e) {
      next(e);
    }
  },
);

router.get('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const isStaff = req.user!.role === UserRole.EMPLOYEE || req.user!.role === UserRole.ADMIN;
    const appt = await prisma.appointment.findFirst({
      where: {
        id,
        ...(isStaff ? {} : { customerId: req.user!.id }),
      },
      include: appointmentInclude,
    });
    if (!appt) {
      throw new AppError(404, 'NOT_FOUND', 'Appointment not found');
    }
    res.json({ appointment: serializeAppointment(appt) });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', validateBody(patchAppointmentSchema), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const isStaff = req.user!.role === UserRole.EMPLOYEE || req.user!.role === UserRole.ADMIN;
    const appt = await prisma.appointment.findUnique({
      where: { id },
    });
    if (!appt) {
      throw new AppError(404, 'NOT_FOUND', 'Appointment not found');
    }

    if (!isStaff && appt.customerId !== req.user!.id) {
      throw new AppError(403, 'FORBIDDEN', 'Cannot modify this appointment');
    }

    const body = req.body as Record<string, unknown>;

    if (!isStaff) {
      if (body.notes !== undefined || body.assignedEmployeeId !== undefined) {
        throw new AppError(403, 'FORBIDDEN', 'Cannot update shop or assignment fields');
      }
      if (
        body.status !== undefined &&
        body.status !== AppointmentStatus.CANCELED &&
        body.status !== appt.status
      ) {
        throw new AppError(403, 'FORBIDDEN', 'Customers may only cancel appointments');
      }
    }

    let startsAt = appt.startsAt;
    let endsAt = appt.endsAt;

    if (body.startsAt !== undefined) {
      startsAt = body.startsAt as Date;
    }
    if (body.endsAt !== undefined) {
      endsAt = body.endsAt as Date;
    }
    if (body.startsAt !== undefined && body.endsAt === undefined && !isStaff) {
      const durationMs = appt.endsAt.getTime() - appt.startsAt.getTime();
      endsAt = new Date(startsAt.getTime() + durationMs);
    }

    if (!isStaff && (body.startsAt !== undefined || body.endsAt !== undefined)) {
      assertCustomerChangeWindow(appt.startsAt);
      if (startsAt.getTime() <= Date.now()) {
        throw new AppError(400, 'VALIDATION_ERROR', 'New appointment time must be in the future');
      }
    }

    if (isStaff && body.startsAt !== undefined && body.endsAt === undefined) {
      const durationMs = appt.endsAt.getTime() - appt.startsAt.getTime();
      endsAt = new Date(startsAt.getTime() + durationMs);
    }

    if (startsAt >= endsAt) {
      throw new AppError(400, 'VALIDATION_ERROR', 'endsAt must be after startsAt');
    }

    const timeChanged =
      startsAt.getTime() !== appt.startsAt.getTime() || endsAt.getTime() !== appt.endsAt.getTime();
    if (timeChanged && appt.status === AppointmentStatus.CANCELED) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Cannot reschedule a canceled appointment');
    }

    if (timeChanged && (await hasSchedulingConflict(startsAt, endsAt, appt.id))) {
      throw new AppError(409, 'CONFLICT', 'This time slot conflicts with an existing appointment');
    }

    let assignedEmployeeId = appt.assignedEmployeeId;
    if (isStaff && body.assignedEmployeeId !== undefined) {
      const v = body.assignedEmployeeId as string | null;
      if (v) {
        const emp = await prisma.user.findFirst({ where: { id: v, role: UserRole.EMPLOYEE } });
        if (!emp) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid assigned employee');
      }
      assignedEmployeeId = v;
    }

    if (timeChanged && assignedEmployeeId) {
      const ok = await employeeCoversSlot(assignedEmployeeId, startsAt, endsAt);
      if (!ok) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Time is outside assigned employee availability (UTC)',
        );
      }
    }

    if (!isStaff && body.status === AppointmentStatus.CANCELED) {
      assertCustomerChangeWindow(appt.startsAt);
    }

    const updated = await prisma.appointment.update({
      where: { id: appt.id },
      data: {
        startsAt,
        endsAt,
        ...(isStaff && body.status !== undefined ? { status: body.status as AppointmentStatus } : {}),
        ...(!isStaff && body.status === AppointmentStatus.CANCELED
          ? { status: AppointmentStatus.CANCELED }
          : {}),
        ...(isStaff && body.notes !== undefined ? { notes: body.notes as string | null } : {}),
        ...(body.customerNotes !== undefined
          ? { customerNotes: body.customerNotes as string | null }
          : {}),
        ...(isStaff && body.assignedEmployeeId !== undefined
          ? { assignedEmployeeId }
          : {}),
      },
      include: appointmentInclude,
    });

    res.json({ appointment: serializeAppointment(updated) });
  } catch (e) {
    next(e);
  }
});

export default router;
