import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { REQUEST_STATUSES } from '@yildirim/shared';
import type { RequestStatus } from '@prisma/client';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestsService } from './requests.service';
import { TransitionDto } from './dto/requests.dto';

@Controller('staff/requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERVISOR', 'ADMIN')
export class StaffRequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get()
  queue(
    @CurrentUser() user: AuthUser,
    @Query('serviceId') serviceId?: string,
    @Query('status') status?: string,
  ) {
    if (status && !(REQUEST_STATUSES as readonly string[]).includes(status)) {
      throw new BadRequestException('BAD_STATUS');
    }
    return this.requests.queue(user, { serviceId, status: status as RequestStatus | undefined });
  }

  @Get(':id')
  one(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.requests.getForStaff(user, id);
  }

  @Post(':id/transition')
  transition(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionDto,
  ) {
    return this.requests.transition(user, id, dto);
  }

  @Post(':id/acceptance-letter')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  attachLetter(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('NO_FILE');
    return this.requests.attachAcceptanceLetter(user, id, file);
  }
}
