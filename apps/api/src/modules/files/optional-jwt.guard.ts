import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Populates req.user when a valid bearer token is present; never rejects. */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  override handleRequest<TUser>(_err: unknown, user: TUser): TUser {
    return user;
  }
}
