import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const workspace = await prisma.workspace.findFirst({ where: { ownerId: session.user.id } });
  if (!workspace) return NextResponse.json({ error: "No workspace found" }, { status: 404 });

  // Reuse active invite or create a new one
  let invite = await prisma.workspaceInvite.findFirst({
    where: { workspaceId: workspace.id, expiresAt: { gt: new Date() } },
  });

  if (!invite) {
    invite = await prisma.workspaceInvite.create({
      data: {
        workspaceId: workspace.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://guestio.vercel.app"}/invite/${invite.token}`;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@resend.dev";

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: email.trim(),
    subject: `You've been invited to join ${workspace.name} on Guestio`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <!-- Logo -->
        <tr><td style="padding-bottom:28px;text-align:center;">
          <span style="font-size:22px;font-weight:800;color:#0F2F61;letter-spacing:-0.5px;">Guestio</span>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:#fff;border-radius:16px;border:1px solid #EDEDE9;padding:40px 36px;">
          <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#262626;line-height:1.3;">
            You're invited! 🎉
          </p>
          <p style="margin:0 0 28px;font-size:15px;color:#6B6B6B;line-height:1.6;">
            <strong style="color:#262626;">${session.user.name}</strong> has invited you to join the
            <strong style="color:#0F2F61;">${workspace.name}</strong> workspace on Guestio.
            You'll have full access to all properties and guests.
          </p>
          <a href="${inviteUrl}"
             style="display:inline-block;background:#FF6700;color:#fff;font-size:15px;font-weight:600;
                    padding:13px 28px;border-radius:10px;text-decoration:none;">
            Join workspace →
          </a>
          <p style="margin:24px 0 0;font-size:12px;color:#BABAB5;line-height:1.6;">
            Or copy this link:<br>
            <a href="${inviteUrl}" style="color:#0F2F61;word-break:break-all;">${inviteUrl}</a>
          </p>
          <p style="margin:20px 0 0;font-size:12px;color:#BABAB5;">
            This invite link is valid for 30 days.
          </p>
        </td></tr>
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#BABAB5;">
            Guestio — Digital guest guidebooks
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  });

  if (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: "Failed to send email. Check your Resend configuration." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
