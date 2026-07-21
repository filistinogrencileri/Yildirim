import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { SaveValuesDto, UploadDocumentDto } from './dto/profile.dto';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.profile.getMyProfile(user.id);
  }

  @Put('values')
  saveValues(@CurrentUser() user: AuthUser, @Body() dto: SaveValuesDto) {
    return this.profile.saveValues(user.id, dto.values);
  }

  @Delete('entries/:sectionId/:entryIndex')
  deleteEntry(
    @CurrentUser() user: AuthUser,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('entryIndex', ParseIntPipe) entryIndex: number,
  ) {
    return this.profile.deleteEntry(user.id, sectionId, entryIndex);
  }

  @Post('photo')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  setPhoto(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('NO_FILE');
    return this.profile.setPhoto(user.id, file);
  }

  @Post('documents')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  uploadDocument(
    @CurrentUser() user: AuthUser,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('NO_FILE');
    return this.profile.uploadDocument(user.id, dto.fieldId, dto.entryIndex ?? 0, file);
  }
}
