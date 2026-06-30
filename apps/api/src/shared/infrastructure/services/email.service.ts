import { Resend } from 'resend'
import { env } from '../../../config/env'

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null
const FROM = 'Auleka <noreply@auleka.com>'

export async function sendVerificationEmail(to: string, firstName: string, token: string) {
  const url = `${env.APP_URL}/personal/verify-email?token=${token}`

  if (!resend) {
    console.log(`[email] verification link for ${to}: ${url}`)
    return
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Confirma tu correo — Auleka',
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#2563EB,#16A34A);padding:32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.5px">auleka</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Tu aula digital</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px">
          <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a">Hola, ${firstName} 👋</h2>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6">
            Ya casi está listo tu aula. Solo confirma tu correo para activar tu cuenta.
          </p>
          <a href="${url}"
             style="display:inline-block;background:#2563EB;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none">
            Confirmar mi correo →
          </a>
          <p style="margin:24px 0 0;font-size:13px;color:#94a3b8">
            El enlace expira en 24 horas. Si no creaste esta cuenta, ignora este mensaje.
          </p>
          <hr style="margin:28px 0;border:none;border-top:1px solid #e2e8f0">
          <p style="margin:0;font-size:12px;color:#cbd5e1">
            O copia este enlace en tu navegador:<br>
            <span style="color:#2563EB;word-break:break-all">${url}</span>
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
          <p style="margin:0;font-size:12px;color:#94a3b8">© ${new Date().getFullYear()} Auleka · Hecho en Ecuador 🇪🇨</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}
