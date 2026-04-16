import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "hareselimovic@gmail.com";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    async sendResetPassword({ user, url }: { user: { email: string; name: string }; url: string }) {
      if (!process.env.RESEND_API_KEY) {
        console.log(`[DEV] Password reset link for ${user.email}: ${url}`);
        return;
      }
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@resend.dev";
      await resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: "Reset your SmartStay password",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:28px;text-align:center;">
          <span style="font-size:22px;font-weight:800;color:#0F2F61;letter-spacing:-0.5px;">SmartStay</span>
        </td></tr>
        <tr><td style="background:#fff;border-radius:16px;border:1px solid #EDEDE9;padding:40px 36px;">
          <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#262626;line-height:1.3;">
            Reset your password
          </p>
          <p style="margin:0 0 28px;font-size:15px;color:#6B6B6B;line-height:1.6;">
            We received a request to reset the password for your SmartStay account (<strong style="color:#262626;">${user.email}</strong>).
            Click the button below to choose a new password.
          </p>
          <a href="${url}"
             style="display:inline-block;background:#FF6700;color:#fff;font-size:15px;font-weight:600;
                    padding:13px 28px;border-radius:10px;text-decoration:none;">
            Reset password →
          </a>
          <p style="margin:24px 0 0;font-size:12px;color:#BABAB5;line-height:1.6;">
            Or copy this link:<br>
            <a href="${url}" style="color:#0F2F61;word-break:break-all;">${url}</a>
          </p>
          <p style="margin:20px 0 0;font-size:12px;color:#BABAB5;">
            This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
          </p>
        </td></tr>
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#BABAB5;">SmartStay — Digital guest guidebooks</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      });
    },
    async beforeCreateUser({ user }: { user: { email: string } }) {
      if (user.email === ADMIN_EMAIL) return;
      const allowed = await prisma.whitelistEmail.findUnique({ where: { email: user.email } });
      if (!allowed) throw new Error("Your email is not on the access list. Contact the administrator.");
    },
    async afterCreateUser({ user }: { user: { email: string; name: string } }) {
      if (!process.env.RESEND_API_KEY) return;
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@resend.dev";
      await resend.emails.send({
        from: fromEmail,
        to: "info@smartstay.ba",
        subject: `Novi korisnik: ${user.email}`,
        html: `<p>Novi korisnik se registrovao na SmartStay.</p>
<p><strong>Ime:</strong> ${user.name ?? "—"}<br>
<strong>Email:</strong> ${user.email}<br>
<strong>Vrijeme:</strong> ${new Date().toLocaleString("bs-BA", { timeZone: "Europe/Sarajevo" })}</p>`,
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:3005",
    "http://localhost:3006",
    "http://localhost:3007",
    "http://localhost:3008",
    "http://localhost:3009",
    "https://smartstay.vercel.app",
    "https://app.smartstay.ba",
  ],
});

export type Session = typeof auth.$Infer.Session;
