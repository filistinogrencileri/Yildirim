import { createHash, randomBytes } from 'crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { FileKind, StoredFile } from '@prisma/client';
import sharp from 'sharp';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

export interface UploadedBuffer {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

const FILE_URL_TTL_SEC = 600;

// Real signature validation — extensions and client mimetypes are not trusted
// (plan module 2: "validate uploaded PDFs by actual file signature").
function sniff(buf: Buffer): 'pdf' | 'jpeg' | 'png' | 'webp' | null {
  if (buf.length > 4 && buf.toString('latin1', 0, 5) === '%PDF-') return 'pdf';
  if (buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length > 7 && buf.readUInt32BE(0) === 0x89504e47) return 'png';
  if (
    buf.length > 11 &&
    buf.toString('latin1', 0, 4) === 'RIFF' &&
    buf.toString('latin1', 8, 12) === 'WEBP'
  )
    return 'webp';
  return null;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async storePdf(
    ownerUserId: string,
    file: UploadedBuffer,
    opts: { kind: FileKind; maxSizeMb?: number },
  ): Promise<StoredFile> {
    const maxBytes = (opts.maxSizeMb ?? 10) * 1024 * 1024;
    if (file.size > maxBytes) throw new BadRequestException('FILE_TOO_LARGE');
    if (sniff(file.buffer) !== 'pdf') throw new BadRequestException('NOT_A_PDF');
    return this.persist(ownerUserId, opts.kind, file.buffer, file.originalname, 'application/pdf');
  }

  /**
   * Profile photo: signature check + biometric white-background check +
   * sharp re-encode (strips EXIF and any payload).
   */
  async storeProfilePhoto(
    ownerUserId: string,
    file: UploadedBuffer,
    opts: { whiteBackground?: boolean } = {},
  ): Promise<StoredFile> {
    if (file.size > 8 * 1024 * 1024) throw new BadRequestException('FILE_TOO_LARGE');
    const kind = sniff(file.buffer);
    if (kind !== 'jpeg' && kind !== 'png' && kind !== 'webp') {
      throw new BadRequestException('NOT_AN_IMAGE');
    }
    if (opts.whiteBackground !== false) await this.assertWhiteBackground(file.buffer);
    const processed = await sharp(file.buffer)
      .rotate() // apply EXIF orientation before it gets stripped
      .resize(512, 512, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 85 })
      .toBuffer();
    return this.persist(ownerUserId, 'PROFILE_PHOTO', processed, 'photo.jpg', 'image/jpeg');
  }

  /**
   * Biometric-photo gate (residence-permit requirement): the background must
   * be white. Runs on the ORIGINAL image (before the cover-crop removes
   * edges): samples the top edge, the corners, and the upper side edges —
   * the bottom edge is skipped because shoulders legitimately occupy it.
   */
  private async assertWhiteBackground(buffer: Buffer): Promise<void> {
    const MIN_CHANNEL = 190; // each of R/G/B at least this bright
    const MAX_SPREAD = 35; // near-gray (no color cast)
    const REQUIRED_RATIO = 0.82;

    const { data, info } = await sharp(buffer)
      .rotate()
      .resize(160, 160, { fit: 'inside' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;

    const isWhite = (x: number, y: number): boolean => {
      const i = (y * width + x) * channels;
      const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!;
      return (
        Math.min(r, g, b) >= MIN_CHANNEL && Math.max(r, g, b) - Math.min(r, g, b) <= MAX_SPREAD
      );
    };

    let total = 0;
    let white = 0;
    // top edge: 3 rows, full width
    for (let y = 0; y < Math.min(3, height); y++) {
      for (let x = 0; x < width; x++) {
        total++;
        if (isWhite(x, y)) white++;
      }
    }
    // side edges: 2 columns each, upper 60% (below that shoulders may touch)
    const sideDepth = Math.floor(height * 0.6);
    for (let y = 3; y < sideDepth; y++) {
      for (const x of [0, 1, width - 2, width - 1]) {
        total++;
        if (isWhite(x, y)) white++;
      }
    }

    if (total === 0 || white / total < REQUIRED_RATIO) {
      throw new BadRequestException('PHOTO_BACKGROUND_NOT_WHITE');
    }
  }

  private async persist(
    ownerUserId: string,
    kind: FileKind,
    buf: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<StoredFile> {
    const storageKey = randomBytes(24).toString('hex');
    await this.storage.put(storageKey, buf);
    return this.prisma.storedFile.create({
      data: {
        ownerUserId,
        kind,
        storageKey,
        originalName: originalName.slice(0, 200),
        mimeType,
        sizeBytes: buf.length,
        sha256: createHash('sha256').update(buf).digest('hex'),
      },
    });
  }

  /** Short-lived signed URL for <img>/<a> access (mirrors R2 presigning in prod). */
  signUrl(fileId: string, userId: string): string {
    const token = this.jwt.sign(
      { sub: userId, fid: fileId, aud: 'file' },
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: FILE_URL_TTL_SEC,
      },
    );
    return `/files/${fileId}?t=${token}`;
  }

  /**
   * Ownership gate: the owner and admins; supervisors gain scoped access when
   * requests land (Phase 3).
   */
  async getForRead(
    fileId: string,
    requester: { id: string; role: string } | null,
    urlToken?: string,
  ): Promise<StoredFile> {
    const file = await this.prisma.storedFile.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('FILE_NOT_FOUND');

    if (urlToken) {
      try {
        const payload = this.jwt.verify<{ fid: string; aud: string }>(urlToken, {
          secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        });
        if (payload.aud === 'file' && payload.fid === fileId) return file;
      } catch {
        throw new ForbiddenException('FILE_URL_EXPIRED');
      }
      throw new ForbiddenException('FILE_ACCESS_DENIED');
    }

    if (!requester) throw new ForbiddenException('FILE_ACCESS_DENIED');
    if (requester.role === 'ADMIN' || file.ownerUserId === requester.id) return file;
    throw new ForbiddenException('FILE_ACCESS_DENIED');
  }

  stream(file: StoredFile) {
    return this.storage.getStream(file.storageKey);
  }
}
