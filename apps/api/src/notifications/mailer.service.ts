import { Injectable, OnModuleDestroy } from '@nestjs/common'
import nodemailer, { Transporter } from 'nodemailer'
import { MailerConfig, loadMailerConfig } from '../config/mailer.config'

@Injectable()
export class MailerService implements OnModuleDestroy {
  private transporter: Transporter
  private config: MailerConfig

  constructor() {
    this.config = loadMailerConfig()
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.port === 465,
      auth: this.config.user ? { user: this.config.user, pass: this.config.pass } : undefined,
    })
  }

  async sendMail(opts: { to: string; subject: string; text: string; html?: string }) {
    const info = await this.transporter.sendMail({
      from: this.config.from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    })

    return info
  }

  async onModuleDestroy() {
    try {
      // nodemailer transports may expose close
      if (typeof (this.transporter as any).close === 'function') (this.transporter as any).close()
    } catch (e) {
      // ignore
    }
  }
}
