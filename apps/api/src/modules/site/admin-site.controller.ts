import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LEGAL_TYPES, type LegalType } from '@yildirim/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FilesService } from '../files/files.service';
import { SiteService } from './site.service';
import { SaveLegalDto, SaveSiteSettingsDto } from './dto/site.dto';

function asLegalType(type: string): LegalType {
  if (!(LEGAL_TYPES as readonly string[]).includes(type)) throw new BadRequestException('BAD_LEGAL_TYPE');
  return type as LegalType;
}

@Controller('admin/site')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSiteController {
  constructor(
    private readonly site: SiteService,
    private readonly files: FilesService,
  ) {}

  @Get('settings')
  async settings() {
    const [settings, privacy, terms] = await Promise.all([
      this.site.getSettings(),
      this.site.getLegal('privacy'),
      this.site.getLegal('terms'),
    ]);
    return {
      ...settings,
      legal: {
        privacy: { title: privacy.title, body: privacy.body, hasPdf: !!privacy.pdfFileId },
        terms: { title: terms.title, body: terms.body, hasPdf: !!terms.pdfFileId },
      },
    };
  }

  @Put('settings')
  saveSettings(@Body() dto: SaveSiteSettingsDto) {
    return this.site.saveSettings(dto);
  }

  @Put('legal/:type')
  saveLegal(@Param('type') type: string, @Body() dto: SaveLegalDto) {
    return this.site.saveLegalText(asLegalType(type), dto.title, dto.body);
  }

  @Post('legal/:type/pdf')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadLegalPdf(
    @Param('type') type: string,
    @CurrentUser() admin: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const legalType = asLegalType(type);
    if (!file) throw new BadRequestException('NO_FILE');
    const stored = await this.files.storePdf(admin.id, file, { kind: 'LEGAL_DOCUMENT', maxSizeMb: 20 });
    return this.site.setLegalPdf(legalType, stored.id);
  }

  @Delete('legal/:type/pdf')
  removeLegalPdf(@Param('type') type: string) {
    return this.site.setLegalPdf(asLegalType(type), null);
  }

  @Get('newsletter')
  subscribers() {
    return this.site.listSubscribers();
  }
}
