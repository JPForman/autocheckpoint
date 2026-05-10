export type UserRole = 'CUSTOMER' | 'EMPLOYEE' | 'ADMIN';

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  createdAt: string;
};

export type Vehicle = {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  vin: string | null;
  licensePlate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELED'
  | 'NO_SHOW';

export type Appointment = {
  id: string;
  customerId: string;
  vehicleId: string;
  startsAt: string;
  endsAt: string;
  serviceType: string;
  status: AppointmentStatus;
  notes: string | null;
  customerNotes: string | null;
  assignedEmployeeId: string | null;
  createdAt: string;
  updatedAt: string;
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
};

export type AvailabilitySlot = {
  id: string;
  employeeId: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

export type ApiErrorBody = {
  error: { code: string; message: string; details?: unknown };
};
