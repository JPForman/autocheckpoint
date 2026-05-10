import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';
import { AppError } from '../middleware/AppError.js';
import { listAvailabilityQuerySchema, putAvailabilitySchema } from '../schemas/availability.schemas.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    if (req.user!.role === UserRole.CUSTOMER) {
      throw new AppError(403, 'FORBIDDEN', 'Not available for customers');
    }
    const parsed = listAvailabilityQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }

    let employeeId: string;
    if (req.user!.role === UserRole.ADMIN) {
      if (!parsed.data.employeeId) {
        throw new AppError(400, 'VALIDATION_ERROR', 'employeeId query parameter is required');
      }
      const u = await prisma.user.findFirst({
        where: { id: parsed.data.employeeId, role: UserRole.EMPLOYEE },
      });
      if (!u) {
        throw new AppError(404, 'NOT_FOUND', 'Employee not found');
      }
      employeeId = u.id;
    } else {
      employeeId = req.user!.id;
    }

    const slots = await prisma.employeeAvailability.findMany({
      where: { employeeId },
      orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
    });
    res.json({ slots, schedulingTimeZone: env.SCHEDULING_TIMEZONE });
  } catch (e) {
    next(e);
  }
});

router.put('/', validateBody(putAvailabilitySchema), async (req, res, next) => {
  try {
    if (req.user!.role === UserRole.CUSTOMER) {
      throw new AppError(403, 'FORBIDDEN', 'Not available for customers');
    }

    const { slots, employeeId: bodyEmployeeId } = req.body;

    let targetEmployeeId: string;
    if (req.user!.role === UserRole.ADMIN) {
      if (!bodyEmployeeId) {
        throw new AppError(400, 'VALIDATION_ERROR', 'employeeId is required for admin');
      }
      const u = await prisma.user.findFirst({
        where: { id: bodyEmployeeId, role: UserRole.EMPLOYEE },
      });
      if (!u) {
        throw new AppError(404, 'NOT_FOUND', 'Employee not found');
      }
      targetEmployeeId = u.id;
    } else {
      if (bodyEmployeeId && bodyEmployeeId !== req.user!.id) {
        throw new AppError(403, 'FORBIDDEN', 'Cannot modify another employee availability');
      }
      targetEmployeeId = req.user!.id;
    }

    await prisma.$transaction([
      prisma.employeeAvailability.deleteMany({ where: { employeeId: targetEmployeeId } }),
      prisma.employeeAvailability.createMany({
        data: slots.map(
          (s: { dayOfWeek: number; startMinute: number; endMinute: number }) => ({
            employeeId: targetEmployeeId,
            dayOfWeek: s.dayOfWeek,
            startMinute: s.startMinute,
            endMinute: s.endMinute,
          }),
        ),
      }),
    ]);

    const saved = await prisma.employeeAvailability.findMany({
      where: { employeeId: targetEmployeeId },
      orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
    });
    res.json({ slots: saved, schedulingTimeZone: env.SCHEDULING_TIMEZONE });
  } catch (e) {
    next(e);
  }
});

export default router;
