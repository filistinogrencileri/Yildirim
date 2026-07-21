-- One active (non-cancelled) request per student per service (plan §3).
-- Prisma cannot express partial unique indexes, hence raw SQL.
CREATE UNIQUE INDEX "requests_service_student_active_key"
ON "requests" ("service_id", "student_id")
WHERE "status" <> 'CANCELLED';
