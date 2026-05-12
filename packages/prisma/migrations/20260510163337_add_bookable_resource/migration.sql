-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "bookableResourceId" INTEGER;

-- CreateTable
CREATE TABLE "public"."BookableResource" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "eventTypeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookableResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookableResource_eventTypeId_isActive_position_idx" ON "public"."BookableResource"("eventTypeId", "isActive", "position");

-- CreateIndex
CREATE UNIQUE INDEX "BookableResource_eventTypeId_slug_key" ON "public"."BookableResource"("eventTypeId", "slug");

-- CreateIndex
CREATE INDEX "Booking_bookableResourceId_idx" ON "public"."Booking"("bookableResourceId");

-- CreateIndex
CREATE INDEX "Booking_bookableResourceId_status_idx" ON "public"."Booking"("bookableResourceId", "status");

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_bookableResourceId_fkey" FOREIGN KEY ("bookableResourceId") REFERENCES "public"."BookableResource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookableResource" ADD CONSTRAINT "BookableResource_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "public"."EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
