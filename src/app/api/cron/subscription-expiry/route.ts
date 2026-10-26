import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "hareselimovic@gmail.com";
const REPLY_TO = "info@smartstay.ba";
const WARN_DAYS = 5;
// Win-back offer window: 5 days after expiry (up to 7 if a daily run was missed)
const WINBACK_AFTER_DAYS = 5;
const WINBACK_LAST_DAY = 7;

/** Calendar date (YYYY-MM-DD) in Sarajevo — subscriptions expire by local day, servers run in UTC */
function sarajevoDay(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Sarajevo" });
}

function daysBetween(fromDay: string, toDay: string): number {
  return Math.round((Date.parse(toDay) - Date.parse(fromDay)) / 86_400_000);
}

/**
 * GET/POST /api/cron/subscription-expiry  (Authorization: Bearer CRON_SECRET, ?dryRun=1)
 * Two notices per subscription period: 5 days before expiry and on the expiry day; plus a one-time
 * win-back offer (30 days free, accepted on /winback/[token]) if still expired 5 days later.
 * Each notice remembers the validUntil it was sent for, so a renewed subscription gets them again.
 * Called daily by Vercel Cron (vercel.json).
 */
export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";

  const today = sarajevoDay(new Date());
  // Wide DB window, exact day matching below
  const subs = await prisma.subscription.findMany({
    where: {
      validUntil: {
        gte: new Date(Date.now() - (WINBACK_LAST_DAY + 1) * 86_400_000),
        lte: new Date(Date.now() + (WARN_DAYS + 2) * 86_400_000),
      },
    },
    include: { user: { select: { name: true, email: true } } },
  });

  const sameFor = (sentFor: Date | null, validUntil: Date) => sentFor?.getTime() === validUntil.getTime();

  const notices: { subId: string; email: string; name: string; validUntil: Date; kind: "5d" | "today" | "winback"; daysLeft: number }[] = [];
  for (const s of subs) {
    if (s.user.email === ADMIN_EMAIL || s.user.email.endsWith(".local")) continue;
    const daysLeft = daysBetween(today, sarajevoDay(s.validUntil));
    const base = { subId: s.id, email: s.user.email, name: s.user.name, validUntil: s.validUntil, daysLeft };
    if (daysLeft === 0 && !sameFor(s.expiryNoticeTodayFor, s.validUntil)) {
      notices.push({ ...base, kind: "today" });
    } else if (daysLeft >= 1 && daysLeft <= WARN_DAYS && !sameFor(s.expiryNotice5dFor, s.validUntil)) {
      // Normally sent exactly 5 days before; a later day only if a run was missed
      notices.push({ ...base, kind: "5d" });
    } else if (-daysLeft >= WINBACK_AFTER_DAYS && -daysLeft <= WINBACK_LAST_DAY && !s.winbackOfferSentAt) {
      // Still expired 5 days later → one-time "30 days free" offer (once per user, ever)
      notices.push({ ...base, kind: "winback" });
    }
  }

  if (dryRun) {
    return NextResponse.json({ dryRun: true, today, notices: notices.map(({ email, kind, daysLeft }) => ({ email, kind, daysLeft })) });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@smartstay.ba";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.smartstay.ba";

  let sent = 0;
  const errors: string[] = [];
  for (const n of notices) {
    if (n.kind === "winback") {
      // Mark first (so a parallel run can't send twice), roll back if the email fails
      const token = randomBytes(24).toString("base64url");
      const marked = await prisma.subscription.updateMany({
        where: { id: n.subId, winbackOfferSentAt: null },
        data: { winbackOfferSentAt: new Date(), winbackToken: token },
      });
      if (marked.count === 0) continue;
      try {
        const { error } = await resend.emails.send({
          from,
          to: n.email,
          replyTo: REPLY_TO,
          subject: "Primijetili smo da niste produžili SmartStay — poklanjamo vam mjesec",
          html: buildWinbackEmail(n.name, `${appUrl}/winback/${token}`),
        });
        if (error) throw new Error(error.message);
        sent++;
      } catch (err) {
        await prisma.subscription.update({ where: { id: n.subId }, data: { winbackOfferSentAt: null, winbackToken: null } });
        errors.push(`${n.email}: ${String(err)}`);
      }
      continue;
    }
    try {
      const { error } = await resend.emails.send({
        from,
        to: n.email,
        replyTo: REPLY_TO,
        subject: n.kind === "today"
          ? "Vaša SmartStay pretplata ističe danas"
          : `Vaša SmartStay pretplata ističe za ${n.daysLeft} ${n.daysLeft === 1 ? "dan" : "dana"}`,
        html: buildExpiryEmail(n.name, n.kind, n.daysLeft, sarajevoDay(n.validUntil), appUrl),
      });
      if (error) throw new Error(error.message);
      await prisma.subscription.update({
        where: { id: n.subId },
        data: n.kind === "today" ? { expiryNoticeTodayFor: n.validUntil } : { expiryNotice5dFor: n.validUntil },
      });
      sent++;
    } catch (err) {
      errors.push(`${n.email}: ${String(err)}`);
    }
  }

  return NextResponse.json({ sent, total: notices.length, ...(errors.length > 0 && { errors }) });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function buildWinbackEmail(name: string, acceptUrl: string): string {
  const firstName = escapeHtml(name.trim().split(/\s+/)[0] ?? "");
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
          <p style="margin:0 0 16px;font-size:24px;font-weight:700;color:#262626;line-height:1.25;">Nedostajete nam${firstName ? `, ${firstName}` : ""}</p>
          <p style="margin:0 0 14px;font-size:15px;color:#4A4A4A;line-height:1.6;">
            Primijetili smo da niste produžili SmartStay pretplatu. Voljeli bismo čuti zašto — da li je nešto nedostajalo,
            nije radilo kako ste očekivali ili jednostavno niste stigli? Samo odgovorite na ovaj email, svaki odgovor čitamo.
          </p>
          <div style="background:#FFF4EC;border:1px solid #FFD9BF;border-radius:12px;padding:20px;margin:22px 0;">
            <p style="margin:0 0 6px;font-size:13px;color:#FF6700;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Poklon za vas</p>
            <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#262626;">Još 30 dana besplatno</p>
            <p style="margin:0 0 18px;font-size:14px;color:#4A4A4A;line-height:1.6;">
              Da biste SmartStay mogli isprobati na miru, poklanjamo vam dodatnih 30 dana — bez kartice i bez obaveze.
              Ponuda važi 14 dana i može se iskoristiti samo jednom.
            </p>
            <a href="${acceptUrl}"
               style="display:inline-block;background:#FF6700;color:#fff;font-size:15px;font-weight:600;padding:14px 28px;border-radius:10px;text-decoration:none;">
              Prihvati 30 dana besplatno →
            </a>
          </div>
          <p style="margin:0;font-size:15px;color:#4A4A4A;">Vaš SmartStay tim</p>
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

function buildExpiryEmail(name: string, kind: "5d" | "today", daysLeft: number, expiryDay: string, appUrl: string): string {
  const firstName = escapeHtml(name.trim().split(/\s+/)[0] ?? "");
  const [y, m, d] = expiryDay.split("-");
  const date = `${d}.${m}.${y}.`;
  const isToday = kind === "today";

  const title = isToday ? "Vaša pretplata ističe danas" : `Vaša pretplata ističe za ${daysLeft} ${daysLeft === 1 ? "dan" : "dana"}`;
  const intro = isToday
    ? `vaša SmartStay pretplata ističe danas (<strong style="color:#262626;">${date}</strong>).`
    : `vaša SmartStay pretplata ističe <strong style="color:#262626;">${date}</strong>.`;
  const after = isToday
    ? "Nakon isteka nećete moći ulaziti u dashboard — uređivati vodiče, vidjeti prijave gostiju i analitiku — dok ne obnovite pretplatu. Vodiči koje ste poslali gostima i dalje rade."
    : "Obnovite je na vrijeme da biste bez prekida nastavili uređivati vodiče, primati prijave gostiju i pratiti analitiku.";

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
          <p style="margin:0 0 6px;font-size:13px;color:#FF6700;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Pretplata</p>
          <p style="margin:0 0 16px;font-size:24px;font-weight:700;color:#262626;line-height:1.25;">${title}</p>
          <p style="margin:0 0 12px;font-size:15px;color:#4A4A4A;line-height:1.6;">
            Zdravo${firstName ? ` ${firstName}` : ""}, ${intro}
          </p>
          <p style="margin:0 0 28px;font-size:15px;color:#4A4A4A;line-height:1.6;">${after}</p>
          <a href="${appUrl}/dashboard/subscription"
             style="display:inline-block;text-align:center;background:#FF6700;color:#fff;font-size:15px;
                    font-weight:600;padding:14px 28px;border-radius:10px;text-decoration:none;">
            Obnovi pretplatu →
          </a>
          <p style="margin:24px 0 0;font-size:14px;color:#6B6B6B;line-height:1.6;">
            Pitanja oko plaćanja ili računa? Samo odgovorite na ovaj email ili pišite na
            <a href="mailto:info@smartstay.ba" style="color:#0F2F61;font-weight:600;">info@smartstay.ba</a>.
          </p>
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
