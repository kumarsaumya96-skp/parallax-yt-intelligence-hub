import nodemailer from "nodemailer";

export interface MailAttachment {
  filename: string;
  path?: string;
  content?: Uint8Array;
  contentType?: string;
}

export interface MailMessage {
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
  attachments?: MailAttachment[];
}

export interface MailProvider {
  readonly name: string;
  send(message: MailMessage): Promise<{ id: string; preview?: string }>;
}

export class PreviewMailProvider implements MailProvider {
  readonly name = "Local preview";

  async send(message: MailMessage) {
    return {
      id: crypto.randomUUID(),
      preview: JSON.stringify(
        { ...message, attachments: message.attachments?.map((item) => ({ filename: item.filename, contentType: item.contentType })) },
        null,
        2,
      ),
    };
  }
}

export class SmtpMailProvider implements MailProvider {
  readonly name = "SMTP";

  async send(message: MailMessage) {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM;
    if (!host || !user || !password || !from) {
      throw new Error("SMTP is selected but SMTP_HOST, SMTP_USER, SMTP_PASSWORD or SMTP_FROM is missing.");
    }

    const port = Number(process.env.SMTP_PORT ?? 587);
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass: password },
    });
    const result = await transport.sendMail({
      from,
      to: message.to,
      cc: message.cc,
      subject: message.subject,
      text: message.text,
      attachments: message.attachments?.map((item) => ({
        filename: item.filename,
        path: item.path,
        content: item.content ? Buffer.from(item.content) : undefined,
        contentType: item.contentType,
      })),
    });
    return { id: result.messageId };
  }
}

export function getMailProvider(): MailProvider {
  return process.env.MAIL_PROVIDER?.toLowerCase() === "smtp" ? new SmtpMailProvider() : new PreviewMailProvider();
}
