import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { AdminSiteController } from './admin-site.controller';
import { SiteController } from './site.controller';
import { SiteService } from './site.service';

@Module({
  imports: [FilesModule],
  controllers: [SiteController, AdminSiteController],
  providers: [SiteService],
})
export class SiteModule {}
