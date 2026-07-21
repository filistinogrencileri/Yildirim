import { Injectable, Logger } from '@nestjs/common';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Dev stub: logs instead of sending. The Resend adapter replaces the `send`
 * implementation at launch (plan Phase 5) without touching call sites.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async send(msg: MailMessage): Promise<void> {
    this.logger.log(`[mail-stub] to=${msg.to} subject="${msg.subject}" body="${msg.text}"`);
  }
}
