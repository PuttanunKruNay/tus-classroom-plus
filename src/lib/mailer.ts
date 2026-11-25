import nodemailer from 'nodemailer';

export interface TeacherAlertPayload {
  toEmail: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  className: string;
  subject: string;
  message: string;
  sentAtThai: string;
}

export interface MailSendResult {
  sent: boolean;
  provider?: 'smtp' | 'resend' | 'webhook';
  error?: string;
}

/**
 * ส่งอีเมลแจ้งเตือนไปยังอีเมลส่วนตัวครูผู้สอนอัตโนมัติ
 * รองรับ 3 ช่องทางฝั่งเซิร์ฟเวอร์:
 * 1) SMTP / Gmail App Password (SMTP_USER + SMTP_PASS)
 * 2) Resend API (RESEND_API_KEY)
 * 3) Custom Webhook / Google Apps Script (EMAIL_WEBHOOK_URL)
 */
export async function sendTeacherNotificationEmail(payload: TeacherAlertPayload): Promise<MailSendResult> {
  const emailSubject = `[TUS Classroom Plus] ข้อความ/แจ้งปัญหาจากนักเรียน: ${payload.subject}`;
  const textBody = [
    `เรียน ${payload.teacherName}`,
    '',
    'มีข้อความ / รายงานปัญหาใหม่จากนักเรียนในระบบ TUS Classroom Plus:',
    `ผู้ส่ง: ${payload.studentName} (รหัส ${payload.studentId} • ห้อง ${payload.className})`,
    `หัวข้อ: ${payload.subject}`,
    `เวลาส่ง: ${payload.sentAtThai}`,
    '',
    'รายละเอียดข้อความ:',
    payload.message,
    '',
    '---',
    'คุณครูสามารถเข้าสู่ระบบหน้าครู → แท็บ "รายงานปัญหาจากนักเรียน" เพื่อพิมพ์ตอบกลับนักเรียนได้ทันที'
  ].join('\n');

  const htmlBody = `
    <div style="font-family: 'Noto Sans Thai', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f3d6e2; border-radius: 16px; overflow: hidden;">
      <div style="background: #B8194F; color: #ffffff; padding: 18px 22px;">
        <h2 style="margin: 0; font-size: 18px;">TUS Classroom Plus — แจ้งเตือนข้อความจากนักเรียน</h2>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">ถึง ${payload.teacherName}</p>
      </div>
      <div style="padding: 20px 22px; background: #ffffff; color: #1f131b; line-height: 1.6;">
        <p style="margin: 0 0 10px;"><strong>ผู้ส่ง:</strong> ${payload.studentName} (รหัส <code>${payload.studentId}</code> • ห้อง ${payload.className})</p>
        <p style="margin: 0 0 10px;"><strong>หัวข้อ:</strong> ${payload.subject}</p>
        <p style="margin: 0 0 14px; font-size: 13px; color: #725a68;">ส่งเมื่อ: ${payload.sentAtThai}</p>
        <div style="background: #fdf2f6; border: 1px solid #f3d6e2; border-radius: 12px; padding: 14px; white-space: pre-wrap;">${payload.message.replace(/</g, '&lt;')}</div>
        <p style="margin: 16px 0 0; font-size: 13px; color: #5a4351;">
          คุณครูสามารถตอบกลับนักเรียนได้ทันทีผ่านระบบครูผู้สอน → แท็บ <strong>“รายงานปัญหาจากนักเรียน”</strong>
        </p>
      </div>
    </div>
  `;

  // 1) SMTP (เช่น Gmail / Google Workspace App Password)
  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || '').trim();
  const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const smtpPort = Number(process.env.SMTP_PORT || 465);

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
        connectionTimeout: 6000,
        greetingTimeout: 6000,
        socketTimeout: 8000
      });

      await transporter.sendMail({
        from: `"TUS Classroom Plus" <${smtpUser}>`,
        to: payload.toEmail,
        subject: emailSubject,
        text: textBody,
        html: htmlBody
      });

      return { sent: true, provider: 'smtp' };
    } catch (err) {
      console.warn('[Mailer SMTP]', err);
      return {
        sent: false,
        provider: 'smtp',
        error: err instanceof Error ? err.message : 'ส่งอีเมล SMTP ไม่สำเร็จ'
      };
    }
  }

  // 2) Resend API
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(6000),
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'TUS Classroom Plus <onboarding@resend.dev>',
          to: [payload.toEmail],
          subject: emailSubject,
          text: textBody,
          html: htmlBody
        })
      });
      if (res.ok) return { sent: true, provider: 'resend' };
      return { sent: false, provider: 'resend', error: `Resend HTTP ${res.status}` };
    } catch (err) {
      return { sent: false, provider: 'resend', error: err instanceof Error ? err.message : 'Resend error' };
    }
  }

  // 3) Webhook / Google Apps Script Relay
  const webhookUrl = (process.env.EMAIL_WEBHOOK_URL || '').trim();
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(6000),
        body: JSON.stringify({
          ...payload,
          to: payload.toEmail,
          subject: emailSubject,
          text: textBody,
          html: htmlBody
        })
      });
      if (res.ok) return { sent: true, provider: 'webhook' };
      return { sent: false, provider: 'webhook', error: `Webhook HTTP ${res.status}` };
    } catch (err) {
      return { sent: false, provider: 'webhook', error: err instanceof Error ? err.message : 'Webhook error' };
    }
  }

  return {
    sent: false,
    error: 'ยังไม่ได้ตั้งค่าอีเมลผู้ส่ง (SMTP) ในหน้าผู้ดูแลระบบ (ข้อความถูกบันทึกขึ้นหน้าครูแล้ว)'
  };
}
