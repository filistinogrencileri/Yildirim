import { Module } from '@nestjs/common';
import { AdminCatalogController } from './admin-catalog.controller';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { StaffCatalogController } from './staff-catalog.controller';

@Module({
  controllers: [CatalogController, AdminCatalogController, StaffCatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
