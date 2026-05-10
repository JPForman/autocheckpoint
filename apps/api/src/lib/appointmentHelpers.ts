import { AppointmentStatus } from '@prisma/client';
import { env } from '../config/env.js';
import { getZonedSlotParts } from './schedulingZone.js';
import { prisma } from './prisma.js';

export async function hasSchedulingConflict(
  startsAt: Date,
  endsAt: Date,
  excludeAppointmentId?: string,
): Promise<boolean> {
  const row = await prisma.appointment.findFirst({
    where: {
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      status: { notIn: [AppointmentStatus.CANCELED] },
      AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
    },
    select: { id: true },
  });
  return !!row;
}

export async function employeeCoversSlot(
  employeeId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<boolean> {
  const slots = await prisma.employeeAvailability.findMany({ where: { employeeId } });
  if (slots.length === 0) return false;

  const tz = env.SCHEDULING_TIMEZONE;
  const startZ = getZonedSlotParts(startsAt, tz);
  const endZ = getZonedSlotParts(endsAt, tz);
  if (startZ.calendarKey !== endZ.calendarKey) {
    return false;
  }

  const { dayOfWeek: startDay, minuteOfDay: sm } = startZ;
  const { minuteOfDay: em } = endZ;
  if (em <= sm) return false;

  return slots.some(
    (s) => s.dayOfWeek === startDay && sm >= s.startMinute && em <= s.endMinute,
  );
}
