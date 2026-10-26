import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "hareselimovic@gmail.com";
const REPLY_TO = "info@smartstay.ba";
const DAYS_AFTER = 5;
// Only people who signed up / left their email from this date get the follow-up (no retroactive blast)
const LAUNCH = new Date("2026-10-26T00:00:00Z");

/**
 * POST /api/cron/onboarding-followup  (Authorization: Bearer CRON_SECRET)
 * Sends a one-time check-in email 5 days after sign-up, or 5 days after a landing-page lead
 * left their email without creating an account. ?dryRun=1 lists recipients without sending.
 * Called daily by .github/workflows/onboarding-followup.yml
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";

  const dueBefore = new Date(Date.now() - DAYS_AFTER * 24 * 60 * 60 * 1000);
  const window = { gte: LAUNCH, lte: dueBefore };

  const [users, leads, alreadySent] = await Promise.all([
    prisma.user.findMany({
      where: { createdAt: window },
      select: { email: true, name: true, _count: { select: { properties: true } } },
    }),
    prisma.whitelistEmail.findMany({ where: { createdAt: window }, select: { email: true } }),
    prisma.onboardingEmail.findMany({ select: { email: true } }),
  ]);

  const skip = new Set(alreadySent.map((s) => s.email.toLowerCase()));
  const isReal = (email: string) => email !== ADMIN_EMAIL && !email.endsWith(".local");

  // Anyone with an account gets the "user" email, even if they were also a lead
  const allUserEmails = new Set(
    (await prisma.user.findMany({ select: { email: true } })).map((u) => u.email.toLowerCase()),
  );

  const recipients: { email: string; kind: "user" | "lead"; name?: string; properties?: number }[] = [];
  for (const u of users) {
    const email = u.email.toLowerCase();
    if (isReal(email) && !skip.has(email)) {
      recipients.push({ email, kind: "user", name: u.name, properties: u._count.properties });
      skip.add(email);
    }
  }
  for (const l of leads) {
    const email = l.email.toLowerCase();
    if (isReal(email) && !skip.has(email) && !allUserEmails.has(email)) {
      recipients.push({ email, kind: "lead" });
      skip.add(email);
    }
  }

  if (dryRun) return NextResponse.json({ dryRun: true, recipients });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@smartstay.ba";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.smartstay.ba";

  let sent = 0;
  const errors: string[] = [];
  for (const r of recipients) {
    try {
      const { error } = await resend.emails.send({
        from,
        to: r.email,
        replyTo: REPLY_TO,
        ...(r.kind === "user"
          ? { subject: "Kako vam ide sa SmartStayom?", html: buildUserEmail(r.name ?? "", r.properties ?? 0, appUrl) }
          : { subject: "Vaš SmartStay trial vas i dalje čeka", html: buildLeadEmail(appUrl) }),
      });
      if (error) throw new Error(error.message);
      await prisma.onboardingEmail.create({ data: { email: r.email, kind: r.kind } });
      sent++;
    } catch (err) {
      errors.push(`${r.email}: ${String(err)}`);
    }
  }

  return NextResponse.json({ sent, total: recipients.length, ...(errors.length > 0 && { errors }) });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const HELP_TOPICS = [
  "Kako popuniti vodič — WiFi, check-in, kućni red, preporuke",
  "Kako poslati guest link gostima i preuzeti QR kod",
  "AI asistent koji gostima odgovara 24/7",
  "Prijava gostiju — podaci iz putne isprave bez slikanja pasoša",
  "Povezivanje s Rentliom",
];

function layout(inner: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="font-size:22px;font-weight:800;color:#0F2F61;letter-spacing:-0.5px;">SmartStay</span>
        </td></tr>
        <tr><td style="background:#fff;border-radius:16px;border:1px solid #EDEDE9;padding:36px;">
          ${inner}
        </td></tr>
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#BABAB5;">SmartStay — Digitalni vodiči za goste</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string, color = "#FF6700") {
  return `<a href="${href}" style="display:inline-block;background:${color};color:#fff;font-size:15px;font-weight:600;padding:13px 26px;border-radius:10px;text-decoration:none;">${label}</a>`;
}

const helpList = HELP_TOPICS
  .map((t) => `<p style="margin:0 0 8px;font-size:14px;color:#262626;line-height:1.5;"><span style="color:#FF6700;font-weight:700;">•</span>&nbsp; ${t}</p>`)
  .join("");

const signOff = `
  <p style="margin:28px 0 0;font-size:15px;color:#4A4A4A;line-height:1.6;">
    <strong style="color:#262626;">Treba vam pomoć?</strong> Samo odgovorite na ovaj email — rado ćemo vam pomoći,
    bilo da je u pitanju postavljanje prvog apartmana ili bilo šta drugo.
  </p>
  <p style="margin:20px 0 0;font-size:15px;color:#4A4A4A;">Vaš SmartStay tim</p>`;

function buildUserEmail(name: string, properties: number, appUrl: string): string {
  const firstName = escapeHtml(name.trim().split(/\s+/)[0] ?? "");
  const noProperty = properties === 0
    ? `<div style="background:#FFF4EC;border:1px solid #FFD9BF;border-radius:12px;padding:16px 18px;margin:0 0 24px;">
         <p style="margin:0 0 10px;font-size:14px;color:#262626;line-height:1.5;">
           <strong>Još niste dodali apartman.</strong> Dodajte prvi apartman, popunite WiFi i check-in upute
           i pošaljite link gostu — za to vam treba oko 10 minuta.
         </p>
         <a href="${appUrl}/dashboard/properties/new" style="font-size:14px;font-weight:600;color:#FF6700;text-decoration:none;">Dodaj apartman →</a>
       </div>`
    : "";

  return layout(`
    <p style="margin:0 0 6px;font-size:24px;font-weight:700;color:#262626;line-height:1.25;">Kako vam ide${firstName ? `, ${firstName}` : ""}?</p>
    <p style="margin:0 0 24px;font-size:15px;color:#4A4A4A;line-height:1.6;">
      Prošlo je nekoliko dana otkako ste kreirali SmartStay nalog. Nadamo se da je sve prošlo bez problema
      i da su vaši gosti već zadovoljni novim digitalnim vodičem.
    </p>
    ${noProperty}
    <p style="margin:0 0 12px;font-size:15px;color:#262626;font-weight:600;">Sve upute su na jednom mjestu — u Pomoći:</p>
    <div style="margin:0 0 24px;">${helpList}</div>
    ${button(`${appUrl}/help`, "Otvori Pomoć →")}
    ${signOff}
  `);
}

function buildLeadEmail(appUrl: string): string {
  return layout(`
    <p style="margin:0 0 6px;font-size:24px;font-weight:700;color:#262626;line-height:1.25;">Vaš trial vas i dalje čeka</p>
    <p style="margin:0 0 24px;font-size:15px;color:#4A4A4A;line-height:1.6;">
      Prije nekoliko dana ostavili ste email na smartstay.ba. Vaš <strong style="color:#262626;">besplatni probni period od 30 dana</strong>
      je i dalje spreman — bez kreditne kartice i bez obaveze. Nalog kreirate za minutu.
    </p>
    ${button(`${appUrl}/register`, "Kreiraj nalog →")}
    <p style="margin:28px 0 12px;font-size:15px;color:#262626;font-weight:600;">Šta vas čeka — sve je objašnjeno u Pomoći:</p>
    <div style="margin:0 0 12px;">${helpList}</div>
    <a href="${appUrl}/help" style="font-size:14px;font-weight:600;color:#0F2F61;">Pogledaj Pomoć →</a>
    ${signOff}
  `);
}
