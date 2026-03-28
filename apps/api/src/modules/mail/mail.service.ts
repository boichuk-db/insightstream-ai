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
      this.logger.warn(
        'SMTP_HOST / SMTP_USER / SMTP_PASS not set — emails will be skipped.',
      );
    }
  }

  get isConfigured() {
    return this.transporter !== null;
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`[DEVELOPMENT MODE] Email to: ${to}`);
      this.logger.warn(`Subject: ${subject}`);

      // Try to extract link from HTML for convenience
      const linkMatch = html.match(/href="([^"]+)"/);
      if (linkMatch) {
        this.logger.log(`🔗 Action Link: ${linkMatch[1]}`);
      }

      console.log(
        '\x1b[36m%s\x1b[0m',
        '------------------- EMAIL PREVIEW -------------------',
      );
      console.log(html.replace(/<[^>]*>?/gm, ' ').trim()); // simple strip tags
      console.log(
        '\x1b[36m%s\x1b[0m',
        '-----------------------------------------------------',
      );
      return;
    }

    const from =
      this.config.get<string>('SMTP_FROM') ||
      'InsightStream <noreply@insightstream.dev>';

    await this.transporter.sendMail({ from, to, subject, html });
    this.logger.log(`Sent "${subject}" → ${to}`);
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="margin-bottom:8px">Reset your password</h2>
        <p style="color:#6b7280;margin-bottom:24px">
          Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;
                  border-radius:8px;text-decoration:none;font-weight:600">
          Reset Password
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `;
    await this.send(to, 'Reset your InsightStream password', html);
  }
}
