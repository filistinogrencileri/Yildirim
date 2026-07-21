import { Controller, Get, Param, ParseUUIDPipe, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { FilesService } from './files.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { OptionalJwtGuard } from './optional-jwt.guard';

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  /** Serves a stored file. Auth: bearer token OR short-lived ?t= signed token. */
  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('t') urlToken: string | undefined,
    @Req() req: Request & { user?: AuthUser },
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.files.getForRead(id, req.user ?? null, urlToken);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const inline = file.mimeType.startsWith('image/');
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
    );
    res.setHeader('Cache-Control', 'private, max-age=300');
    this.files.stream(file).pipe(res);
  }
}
