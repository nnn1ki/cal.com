UPDATE "Booking" AS "originalBooking"
SET "rescheduled" = true
FROM "Booking" AS "replacementBooking"
WHERE "replacementBooking"."fromReschedule" = "originalBooking"."uid"
  AND "originalBooking"."status" = 'cancelled'
  AND "originalBooking"."rescheduled" IS NOT true;
