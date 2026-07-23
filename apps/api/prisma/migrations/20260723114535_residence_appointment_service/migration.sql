-- AlterEnum
ALTER TYPE "FieldType" ADD VALUE 'DATETIME';

-- AlterTable
ALTER TABLE "requests" ADD COLUMN     "outcome_data" JSONB;

-- CreateTable
CREATE TABLE "service_extra_fields" (
    "id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" JSONB NOT NULL,
    "type" "FieldType" NOT NULL,
    "list_id" UUID,
    "validation" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_extra_fields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_extra_fields_service_id_key_key" ON "service_extra_fields"("service_id", "key");

-- AddForeignKey
ALTER TABLE "service_extra_fields" ADD CONSTRAINT "service_extra_fields_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_extra_fields" ADD CONSTRAINT "service_extra_fields_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
