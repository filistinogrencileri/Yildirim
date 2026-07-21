import { createReadStream } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import type { Readable } from 'stream';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';

/**
 * Object-storage seam. Dev uses the local disk; production swaps this service
 * for an S3/R2-backed implementation with the same surface (plan §7 requires
 * object storage + signed URLs in prod — the signing part lives in FilesService).
 */
@Injectable()
export class StorageService {
  private readonly baseDir: string;

  constructor(config: ConfigService<Env, true>) {
    this.baseDir = resolve(process.cwd(), config.get('UPLOAD_DIR', { infer: true }));
  }

  private pathFor(key: string): string {
    // two-level fanout keeps directories small
    return resolve(this.baseDir, key.slice(0, 2), key);
  }

  async put(key: string, buf: Buffer): Promise<void> {
    const p = this.pathFor(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, buf);
  }

  getStream(key: string): Readable {
    return createReadStream(this.pathFor(key));
  }

  async delete(key: string): Promise<void> {
    await unlink(this.pathFor(key)).catch(() => undefined);
  }
}
