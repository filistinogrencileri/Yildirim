import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { FilesModule } from '../files/files.module';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { StaffRequestsController } from './staff-requests.controller';

@Module({
  imports: [FilesModule, CatalogModule],
  controllers: [RequestsController, StaffRequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
