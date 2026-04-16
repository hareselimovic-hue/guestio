import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Auto-whitelist email so they can register immediately
  const { prisma } = await import("@/lib/prisma");
  await prisma.whitelistEmail.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@resend.dev";

    await Promise.all([
      // Internal notification
      resend.emails.send({
        from: fromEmail,
        to: "info@smartstay.ba",
        subject: `Novi lead sa smartstay.ba: ${email}`,
        html: `<p>Neko je ostavio email na landing pageu SmartStay.</p>
<p><strong>Email:</strong> ${email}<br>
<strong>Vrijeme:</strong> ${new Date().toLocaleString("bs-BA", { timeZone: "Europe/Sarajevo" })}</p>`,
      }),
      // Confirmation to visitor
      resend.emails.send({
        from: fromEmail,
        to: email,
        subject: "Dobrodošli u SmartStay — kreirajte nalog",
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
            Hvala na prijavi! 🎉
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#6B6B6B;line-height:1.6;">
            Vaš email je dodan na listu i možete se odmah registrovati na SmartStay platformi.
          </p>
          <div style="background:#F0FFF4;border:1px solid #BBF7D0;border-radius:10px;padding:14px 18px;margin:0 0 24px;">
            <p style="margin:0;font-size:14px;font-weight:600;color:#166534;">
              🎁 Prvim korisnicima — 1 mjesec besplatno
            </p>
          </div>
          <p style="margin:0 0 20px;font-size:15px;color:#6B6B6B;line-height:1.6;">
            Kliknite na dugme ispod, kreirajte nalog i počnite odmah:
          </p>
          <a href="https://app.smartstay.ba/register"
             style="display:inline-block;background:#FF6700;color:#fff;font-size:15px;font-weight:600;
                    padding:13px 28px;border-radius:10px;text-decoration:none;">
            Kreirajte nalog →
          </a>
          <p style="margin:24px 0 0;font-size:12px;color:#BABAB5;">
            Ako niste vi ostavili ovaj email, slobodno ignorirajte ovu poruku.
          </p>
        </td></tr>
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#BABAB5;">SmartStay — Digitalni vodiči za goste</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }),
    ]);
  }

  return NextResponse.json({ ok: true }, {
    headers: {
      "Access-Control-Allow-Origin": "https://smartstay.ba",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://smartstay.ba",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
