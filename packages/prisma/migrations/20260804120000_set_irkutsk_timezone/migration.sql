ALTER TABLE "users" ALTER COLUMN "timeZone" SET DEFAULT 'Asia/Irkutsk';

UPDATE "users"
SET "timeZone" = 'Asia/Irkutsk'
WHERE "timeZone" IS DISTINCT FROM 'Asia/Irkutsk';

UPDATE "Schedule"
SET "timeZone" = 'Asia/Irkutsk'
WHERE "timeZone" IS DISTINCT FROM 'Asia/Irkutsk';

UPDATE "TravelSchedule"
SET "timeZone" = 'Asia/Irkutsk'
WHERE "timeZone" IS DISTINCT FROM 'Asia/Irkutsk';
