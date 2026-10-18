import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import {
  encryptGuests, formatDateBs, getRegistrationWorkspace, isValidDate, parseGuest,
} from "@/lib/guest-registration";

export const dynamic = "force-dynamic";

const MAX_GUESTS = 20;

// Public endpoint — guests submit their registration from the guide link.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Honeypot: real users never fill this hidden field
  if (body.website) return NextResponse.json({ ok: true });

  const { slug, checkIn, checkOut, guests } = body as Record<string, unknown>;
  if (typeof slug !== "string" || !isValidDate(checkIn) || !isValidDate(checkOut) || checkOut <= checkIn) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
  }
  if (!Array.isArray(guests) || guests.length === 0 || guests.length > MAX_GUESTS) {
    return NextResponse.json({ error: "Invalid guests" }, { status: 400 });
  }
  const parsed = guests.map(parseGuest);
  if (parsed.some((g) => g === null)) {
    return NextResponse.json({ error: "Invalid guest data" }, { status: 400 });
  }
  const validGuests = parsed as NonNullable<(typeof parsed)[number]>[];

  const property = await prisma.property.findUnique({
    where: { slug },
    select: { id: true, name: true, userId: true, workspaceId: true, guestRegistrationEnabled: true },
  });
  const workspace = property?.guestRegistrationEnabled ? await getRegistrationWorkspace(property) : null;
  if (!property || !workspace?.guestRegistrationEnabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lead = validGuests[0];
  const registration = await prisma.guestRegistration.create({
    data: {
      propertyId: property.id,
      checkIn: new Date(checkIn + "T00:00:00Z"),
      checkOut: new Date(checkOut + "T00:00:00Z"),
      guestCount: validGuests.length,
      leadGuestName: `${lead.firstName} ${lead.lastName}`,
      guestsEnc: encryptGuests(validGuests),
    },
  });

  // Notify the workspace's registration emails (Settings), falling back to the owner.
  // Failure must not fail the guest's submission.
  const recipients = workspace.registrationEmails.length > 0 ? workspace.registrationEmails : [workspace.owner.email];
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.smartstay.ba";
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@smartstay.ba",
      to: recipients,
      subject: `Nova prijava gostiju: ${property.name} (${formatDateBs(checkIn)} – ${formatDateBs(checkOut)})`,
      html: buildRegistrationEmail({
        propertyName: property.name,
        checkIn, checkOut,
        names: validGuests.map((g) => `${g.firstName} ${g.lastName}`),
        url: `${appUrl}/dashboard/registrations?property=${property.id}#${registration.id}`,
      }),
    });
  } catch (err) {
    console.error("[guest-registration] email failed", err);
  }

  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function buildRegistrationEmail(p: {
  propertyName: string; checkIn: string; checkOut: string; names: string[]; url: string;
}): string {
  const count = p.names.length;
  const personWord = count === 1 ? "osoba" : count < 5 ? "osobe" : "osoba";
  const nameRows = p.names
    .map((n) => `<p style="margin:0;padding:10px 0;border-bottom:1px solid #EDEDE9;font-size:14px;color:#262626;">${escapeHtml(n)}</p>`)
    .join("");

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
          <p style="margin:0 0 6px;font-size:13px;color:#FF6700;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Prijava gostiju</p>
          <p style="margin:0 0 6px;font-size:24px;font-weight:700;color:#262626;line-height:1.25;">${escapeHtml(p.propertyName)}</p>
          <p style="margin:0 0 28px;font-size:15px;color:#6B6B6B;">
            ${formatDateBs(p.checkIn)} – ${formatDateBs(p.checkOut)} · <strong style="color:#0F2F61;">${count} ${personWord}</strong>
          </p>
          <div style="background:#FAFAF8;border-radius:10px;padding:0 16px;margin-bottom:28px;">
            ${nameRows}
            <div style="padding:6px 0 0;"></div>
          </div>
          <a href="${p.url}"
             style="display:inline-block;text-align:center;background:#0F2F61;color:#fff;font-size:15px;
                    font-weight:600;padding:14px 28px;border-radius:10px;text-decoration:none;">
            Otvori prijavu u SmartStayu →
          </a>
        </td></tr>
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#BABAB5;">
            Podaci o putnim ispravama nisu u emailu iz sigurnosnih razloga — vidljivi su samo u SmartStayu.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
