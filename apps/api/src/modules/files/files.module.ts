import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { OptionalJwtGuard } from './optional-jwt.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [FilesController],
  providers: [FilesService, OptionalJwtGuard],
  exports: [FilesService],
})
export class FilesModule {}
