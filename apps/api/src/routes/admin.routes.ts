import { Router } from 'express';
import { AppointmentStatus, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody } from '../middleware/validate.js';
import { AppError } from '../middleware/AppError.js';
import {
  listUsersQuerySchema,
  patchUserSchema,
  patchUserRoleSchema,
} from '../schemas/user.schemas.js';
const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.ADMIN));

async function assertCanChangeRole(targetUserId: string, newRole: UserRole) {
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }
  if (target.role === UserRole.ADMIN && newRole !== UserRole.ADMIN) {
    const adminCount = await prisma.user.count({ where: { role: UserRole.ADMIN } });
    if (adminCount <= 1) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Cannot remove the last admin');
    }
  }
}

router.get('/users', async (req, res, next) => {
  try {
    const parsed = listUsersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    const { page, pageSize, role, search } = parsed.data;
    const where = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' as const } },
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      }),
    ]);
    res.json({
      page,
      pageSize,
      total,
      users: users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
    });
  } catch (e) {
    next(e);
  }
});

router.patch('/users/:id', validateBody(patchUserSchema), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const user = await prisma.user.update({
      where: { id },
      data: req.body,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
    res.json({ user: { ...user, createdAt: user.createdAt.toISOString() } });
  } catch (e) {
    next(e);
  }
});

router.patch('/users/:id/role', validateBody(patchUserRoleSchema), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const { role: newRole } = req.body;
    await assertCanChangeRole(id, newRole);
    const user = await prisma.user.update({
      where: { id },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
    res.json({ user: { ...user, createdAt: user.createdAt.toISOString() } });
  } catch (e) {
    next(e);
  }
});

router.get('/analytics/summary', async (req, res, next) => {
  try {
    const fromRaw = req.query.from as string | undefined;
    const toRaw = req.query.to as string | undefined;
    const from = fromRaw ? new Date(fromRaw) : new Date(Date.now() - 30 * 86_400_000);
    const to = toRaw ? new Date(toRaw) : new Date(Date.now() + 90 * 86_400_000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid from or to date');
    }

    const [byStatus, upcoming, totalUsers] = await prisma.$transaction([
      prisma.appointment.groupBy({
        by: ['status'],
        where: { startsAt: { gte: from, lte: to } },
        _count: { _all: true },
        orderBy: { status: 'asc' },
      }),
      prisma.appointment.count({
        where: {
          startsAt: { gte: new Date() },
          status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.IN_PROGRESS] },
        },
      }),
      prisma.user.count(),
    ]);

    res.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      appointmentsByStatus: Object.fromEntries(
        byStatus.map((r) => {
          const c = r._count as { _all: number };
          return [r.status, c._all];
        }),
      ) as Partial<Record<AppointmentStatus, number>>,
      upcomingScheduledCount: upcoming,
      totalUsers,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
