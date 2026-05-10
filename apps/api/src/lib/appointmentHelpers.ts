import { AppointmentStatus } from '@prisma/client';
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

  const startDay = startsAt.getUTCDay();
  const endDay = endsAt.getUTCDay();
  if (startDay !== endDay) {
    return false;
  }

  const sm = startsAt.getUTCHours() * 60 + startsAt.getUTCMinutes();
  const em = endsAt.getUTCHours() * 60 + endsAt.getUTCMinutes();
  if (em <= sm) return false;

  return slots.some(
    (s) => s.dayOfWeek === startDay && sm >= s.startMinute && em <= s.endMinute,
  );
}
