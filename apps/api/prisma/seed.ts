import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { PrismaClient, UserRole, AppointmentStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Demo12345!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@autocheckpoint.local' },
    update: {},
    create: {
      email: 'admin@autocheckpoint.local',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Admin',
      phone: '555-0100',
      role: UserRole.ADMIN,
    },
  });

  const emp1 = await prisma.user.upsert({
    where: { email: 'morgan@autocheckpoint.local' },
    update: {},
    create: {
      email: 'morgan@autocheckpoint.local',
      passwordHash,
      firstName: 'Morgan',
      lastName: 'Mechanic',
      phone: '555-0101',
      role: UserRole.EMPLOYEE,
    },
  });

  const emp2 = await prisma.user.upsert({
    where: { email: 'jamie@autocheckpoint.local' },
    update: {},
    create: {
      email: 'jamie@autocheckpoint.local',
      passwordHash,
      firstName: 'Jamie',
      lastName: 'Tech',
      phone: '555-0102',
      role: UserRole.EMPLOYEE,
    },
  });

  const cust1 = await prisma.user.upsert({
    where: { email: 'chris@example.com' },
    update: {},
    create: {
      email: 'chris@example.com',
      passwordHash,
      firstName: 'Chris',
      lastName: 'Customer',
      phone: '555-0200',
      role: UserRole.CUSTOMER,
    },
  });

  const cust2 = await prisma.user.upsert({
    where: { email: 'dana@example.com' },
    update: {},
    create: {
      email: 'dana@example.com',
      passwordHash,
      firstName: 'Dana',
      lastName: 'Driver',
      phone: '555-0201',
      role: UserRole.CUSTOMER,
    },
  });

  await prisma.employeeAvailability.deleteMany({
    where: { employeeId: { in: [emp1.id, emp2.id] } },
  });

  const weekly = (employeeId: string) => [
    { employeeId, dayOfWeek: 1, startMinute: 9 * 60, endMinute: 17 * 60 },
    { employeeId, dayOfWeek: 2, startMinute: 9 * 60, endMinute: 17 * 60 },
    { employeeId, dayOfWeek: 3, startMinute: 9 * 60, endMinute: 17 * 60 },
    { employeeId, dayOfWeek: 4, startMinute: 9 * 60, endMinute: 17 * 60 },
    { employeeId, dayOfWeek: 5, startMinute: 9 * 60, endMinute: 17 * 60 },
  ];

  await prisma.employeeAvailability.createMany({
    data: [...weekly(emp1.id), ...weekly(emp2.id)],
  });

  const v1 = await prisma.vehicle.upsert({
    where: { id: 'seed_vehicle_cust1_prius' },
    update: {},
    create: {
      id: 'seed_vehicle_cust1_prius',
      userId: cust1.id,
      make: 'Toyota',
      model: 'Prius',
      year: 2020,
      licensePlate: 'ABC-1234',
    },
  });

  const v2 = await prisma.vehicle.upsert({
    where: { id: 'seed_vehicle_cust2_civic' },
    update: {},
    create: {
      id: 'seed_vehicle_cust2_civic',
      userId: cust2.id,
      make: 'Honda',
      model: 'Civic',
      year: 2018,
      licensePlate: 'XYZ-9999',
    },
  });

  await prisma.appointment.deleteMany({
    where: { id: { startsWith: 'seed_appt_' } },
  });

  const now = Date.now();
  const hour = 60 * 60 * 1000;

  await prisma.appointment.createMany({
    data: [
      {
        id: 'seed_appt_past',
        customerId: cust1.id,
        vehicleId: v1.id,
        startsAt: new Date(now - 7 * 24 * hour + 10 * hour),
        endsAt: new Date(now - 7 * 24 * hour + 11 * hour),
        serviceType: 'Oil change',
        status: AppointmentStatus.COMPLETED,
        notes: 'Synthetic oil used',
        customerNotes: 'Check tire pressure',
        assignedEmployeeId: emp1.id,
      },
      {
        id: 'seed_appt_upcoming',
        customerId: cust1.id,
        vehicleId: v1.id,
        startsAt: new Date(now + 3 * 24 * hour + 14 * hour),
        endsAt: new Date(now + 3 * 24 * hour + 15 * hour),
        serviceType: 'Brake inspection',
        status: AppointmentStatus.SCHEDULED,
        assignedEmployeeId: emp1.id,
      },
      {
        id: 'seed_appt_dana',
        customerId: cust2.id,
        vehicleId: v2.id,
        startsAt: new Date(now + 5 * 24 * hour + 16 * hour),
        endsAt: new Date(now + 5 * 24 * hour + 17 * hour),
        serviceType: 'Tire rotation',
        status: AppointmentStatus.SCHEDULED,
        assignedEmployeeId: emp2.id,
      },
    ],
  });

  console.log('Seed complete.');
  console.log('Demo password for all seeded users: Demo12345!');
  console.log({ admin: admin.email, employees: [emp1.email, emp2.email], customers: [cust1.email, cust2.email] });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
