import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('services')
  list() {
    return this.catalog.listPublished();
  }

  /** Published services + the current student's eligibility for each. */
  @Get('my-services')
  @UseGuards(JwtAuthGuard)
  myServices(@CurrentUser() user: AuthUser) {
    return this.catalog.myServices(user.id);
  }

  @Get('services/:slug')
  detail(@Param('slug') slug: string) {
    return this.catalog.getBySlug(slug);
  }

  @Get('services/:slug/eligibility')
  @UseGuards(JwtAuthGuard)
  eligibility(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.catalog.eligibility(slug, user.id);
  }
}
