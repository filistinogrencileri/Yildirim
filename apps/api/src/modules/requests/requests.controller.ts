import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestsService } from './requests.service';
import { ApplyDto } from './dto/requests.dto';

@Controller('requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  apply(@CurrentUser() user: AuthUser, @Body() dto: ApplyDto) {
    return this.requests.apply(user.id, dto.serviceSlug, dto.choices);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.requests.myRequests(user.id);
  }

  @Get(':id')
  one(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.requests.myRequest(user.id, id);
  }

  @Post(':id/resubmit')
  resubmit(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.requests.resubmit(user.id, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.requests.cancel(user.id, id);
  }
}
