import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly ses: SESClient | null = null;
  private readonly fromEmail: string;

  constructor(private config: ConfigService) {
    const region = config.get<string>('AWS_REGION') || 'eu-north-1';
    const from = config.get<string>('SES_FROM_EMAIL');

    this.fromEmail = from || 'noreply@insightstream.app';

    if (from) {
      this.ses = new SESClient({ region });
      this.logger.log(`Mail service ready via SES (from: ${this.fromEmail})`);
    } else {
      this.logger.warn('SES_FROM_EMAIL not set — emails will be logged only.');
    }
  }

  get isConfigured() {
    return this.ses !== null;
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.ses) {
      this.logger.warn(`[DEV] Email to: ${to} | Subject: ${subject}`);
      const linkMatch = html.match(/href="([^"]+)"/);
      if (linkMatch) this.logger.log(`Action Link: ${linkMatch[1]}`);
      return;
    }

    await this.ses.send(new SendEmailCommand({
      Source: this.fromEmail,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: { Html: { Data: html, Charset: 'UTF-8' } },
      },
    }));

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
