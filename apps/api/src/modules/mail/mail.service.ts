import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(config.get<string>('SMTP_PORT') || '587'),
        secure: config.get<string>('SMTP_PORT') === '465',
        auth: { user, pass },
      });
      this.logger.log(`Mail service ready (host: ${host})`);
    } else {
      this.logger.warn('SMTP_HOST / SMTP_USER / SMTP_PASS not set — emails will be skipped.');
    }
  }

  get isConfigured() {
    return this.transporter !== null;
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`[SKIP] Email to ${to} — SMTP not configured.`);
      return;
    }

    const from = this.config.get<string>('SMTP_FROM') || 'InsightStream <noreply@insightstream.dev>';

    await this.transporter.sendMail({ from, to, subject, html });
    this.logger.log(`Sent "${subject}" → ${to}`);
  }
}
