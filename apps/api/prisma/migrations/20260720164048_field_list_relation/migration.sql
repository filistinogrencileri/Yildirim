-- AddForeignKey
ALTER TABLE "field_definitions" ADD CONSTRAINT "field_definitions_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
