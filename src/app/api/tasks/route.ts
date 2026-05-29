import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds } from "@/lib/workspace";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const INCLUDE = {
  author: { select: { id: true, name: true, email: true, image: true } },
  property: { select: { id: true, name: true } },
  comments: {
    include: { author: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" as const },
  },
};

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wsIds = await getUserWorkspaceIds(session.user.id);
  if (wsIds.length === 0) return NextResponse.json([]);

  const tasks = await prisma.task.findMany({
    where: { workspaceId: { in: wsIds } },
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, propertyId, mentionIds } = await req.json() as {
    content: string;
    propertyId?: string;
    mentionIds?: string[];
  };

  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const wsIds = await getUserWorkspaceIds(session.user.id);
  if (wsIds.length === 0) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const task = await prisma.task.create({
    data: {
      workspaceId: wsIds[0],
      authorId: session.user.id,
      content: content.trim(),
      propertyId: propertyId || null,
      mentionIds: mentionIds || [],
    },
    include: INCLUDE,
  });

  // Send email to mentioned users (fire and forget)
  if (mentionIds && mentionIds.length > 0 && process.env.RESEND_API_KEY) {
    sendMentionEmails(task, session.user.name ?? session.user.email, mentionIds).catch(() => {});
  }

  return NextResponse.json(task, { status: 201 });
}

async function sendMentionEmails(
  task: { id: string; content: string; property: { name: string } | null },
  authorName: string,
  mentionIds: string[]
) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL ?? "info@smartstay.ba";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.smartstay.ba";

  const users = await prisma.user.findMany({
    where: { id: { in: mentionIds } },
    select: { email: true, name: true },
  });

  for (const user of users) {
    const preview = task.content.length > 120 ? task.content.slice(0, 120) + "…" : task.content;
    const propertyLine = task.property ? `<p style="margin:0 0 16px;font-size:13px;color:#6B6B6B;">🏠 ${task.property.name}</p>` : "";

    await resend.emails.send({
      from,
      to: user.email,
      subject: `${authorName} te je označio/la u Team Channelu`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="font-size:22px;font-weight:800;color:#0F2F61;letter-spacing:-0.5px;">SmartStay</span>
        </td></tr>
        <tr><td style="background:#fff;border-radius:16px;border:1px solid #EDEDE9;padding:36px;">
          <p style="margin:0 0 6px;font-size:13px;color:#FF6700;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Team Channel</p>
          <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#262626;line-height:1.3;">
            ${authorName} te je označio/la
          </p>
          ${propertyLine}
          <div style="background:#F7F7F5;border-radius:10px;padding:16px;margin-bottom:28px;border-left:3px solid #0F2F61;">
            <p style="margin:0;font-size:15px;color:#262626;line-height:1.6;">${preview}</p>
          </div>
          <a href="${appUrl}/dashboard/team"
             style="display:inline-block;background:#0F2F61;color:#fff;font-size:15px;font-weight:600;
                    padding:13px 28px;border-radius:10px;text-decoration:none;">
            Otvori Team Channel →
          </a>
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
  }
}
