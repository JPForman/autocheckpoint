-- CreateEnum
CREATE TYPE "TowJobStatus" AS ENUM ('PENDING', 'EN_ROUTE', 'VEHICLE_LOADED', 'IN_TRANSIT', 'DELIVERED', 'CANCELED');

-- CreateTable
CREATE TABLE "TowJob" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT,
    "vehicleDesc" TEXT,
    "customerId" TEXT,
    "createdById" TEXT NOT NULL,
    "status" "TowJobStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "pickupLat" DOUBLE PRECISION NOT NULL,
    "pickupLng" DOUBLE PRECISION NOT NULL,
    "pickupLabel" TEXT,
    "destinationLat" DOUBLE PRECISION NOT NULL,
    "destinationLng" DOUBLE PRECISION NOT NULL,
    "destinationLabel" TEXT,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "currentUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TowJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TowJob_customerId_idx" ON "TowJob"("customerId");

-- CreateIndex
CREATE INDEX "TowJob_status_idx" ON "TowJob"("status");

-- CreateIndex
CREATE INDEX "TowJob_createdById_idx" ON "TowJob"("createdById");

-- AddForeignKey
ALTER TABLE "TowJob" ADD CONSTRAINT "TowJob_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowJob" ADD CONSTRAINT "TowJob_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowJob" ADD CONSTRAINT "TowJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
