import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const source = body.source;
  // Better Auth stores emails lowercased — keep the whitelist in the same form
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Leads from smartstay.ba/hoteli/ land on signup with "Hotel" preselected
  const isHotel = source === "hotel_page";
  // Leads from the English site (smartstay.ba/en/...) get the confirmation email in English
  const isEnglish = body.lang === "en";
  const registerUrl = `https://app.smartstay.ba/register?${isHotel ? "type=hotel&" : ""}email=${encodeURIComponent(email)}`;

  // Lead list (registration is open to everyone; this marks hotel leads + feeds the onboarding follow-up)
  const { prisma } = await import("@/lib/prisma");
  // Hotels page leads are marked so their signup gets hotel mode
  await prisma.whitelistEmail.upsert({
    where: { email },
    update: isHotel ? { hotel: true } : {},
    create: { email, hotel: isHotel },
  });

  // Emails are best-effort: the visitor is already whitelisted and the landing page sends them
  // straight to registration, so a mail failure must not fail the request.
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@resend.dev";
    const t = isEnglish
      ? {
          subject: "Your 30-day trial is ready — SmartStay",
          eyebrow: "🎁 Limited offer", headline: "30 days free", noCard: "No credit card",
          title: "Your trial is ready! 🎉",
          intro: "Your account is waiting. Create it in a minute and use every SmartStay feature right away: no credit card, no commitment.",
          bullets: ["Digital guest guide", "AI chatbot 24/7", "Rentlio sync", "Cancel anytime, no commitment"],
          cta: "Start your free trial →",
          ignore: "If you didn't leave this email address, feel free to ignore this message.",
          footer: "SmartStay — Digital guest guides",
        }
      : {
          subject: "Vaš 30-dnevni trial je spreman — SmartStay",
          eyebrow: "🎁 Ograničena ponuda", headline: "30 dana besplatno", noCard: "Bez kreditne kartice",
          title: "Vaš trial je spreman! 🎉",
          intro: "Vaš nalog vas čeka. Napravite ga za minut i odmah koristite sve funkcije SmartStaya: bez kreditne kartice, bez obaveze.",
          bullets: ["Digitalni vodič za goste", "AI chatbot 24/7", "Rentlio sync", "Otkaz kad god, bez obaveze"],
          cta: "Počnite besplatni trial →",
          ignore: "Ako niste vi ostavili ovaj email, slobodno ignorirajte ovu poruku.",
          footer: "SmartStay — Digitalni vodiči za goste",
        };

    await Promise.allSettled([
      // Internal notification
      resend.emails.send({
        from: fromEmail,
        to: "info@smartstay.ba",
        subject: `Novi lead sa smartstay.ba: ${email}`,
        html: `<p>Neko je ostavio email na landing pageu SmartStay.</p>
<p><strong>Email:</strong> ${email}<br>
<strong>Izvor:</strong> ${isHotel ? "Stranica za hotele" : source === "trial_popup" ? "Trial popup" : "Kontakt forma"}${isEnglish ? " (engleska stranica)" : ""}<br>
<strong>Vrijeme:</strong> ${new Date().toLocaleString("bs-BA", { timeZone: "Europe/Sarajevo" })}</p>`,
      }),
      // Confirmation to visitor — isti email bez obzira na izvor (bosanski ili engleski prema stranici)
      resend.emails.send({
        from: fromEmail,
        to: email,
        subject: t.subject,
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
        <tr><td style="background:#fff;border-radius:16px;border:1px solid #EDEDE9;overflow:hidden;">
          <!-- Orange header -->
          <div style="background:#FF6700;padding:28px 36px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:0.5px;">${t.eyebrow}</p>
            <p style="margin:0;font-size:26px;font-weight:800;color:#fff;line-height:1.2;">${t.headline}</p>
            <p style="margin:4px 0 0;font-size:14px;color:rgba(255,255,255,0.8);">${t.noCard}</p>
          </div>
          <!-- Body -->
          <div style="padding:32px 36px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#262626;line-height:1.3;">
              ${t.title}
            </p>
            <p style="margin:0 0 20px;font-size:15px;color:#6B6B6B;line-height:1.6;">
              ${t.intro}
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              ${t.bullets.map((b) => `<tr><td style="padding:8px 0;font-size:14px;color:#262626;"><span style="color:#22c55e;font-weight:700;">✓</span>&nbsp; ${b}</td></tr>`).join("\n              ")}
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px;">
              <tr><td align="center">
                <a href="${registerUrl}"
                   style="display:inline-block;background:#FF6700;color:#fff;font-size:16px;font-weight:700;
                          padding:15px 36px;border-radius:12px;text-decoration:none;text-align:center;">
                  ${t.cta}
                </a>
              </td></tr>
            </table>
            <p style="margin:20px 0 0;font-size:12px;color:#BABAB5;text-align:center;">
              ${t.ignore}
            </p>
          </div>
        </td></tr>
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#BABAB5;">${t.footer}</p>
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
