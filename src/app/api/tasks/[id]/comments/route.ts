import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds } from "@/lib/workspace";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { content, mentionIds } = await req.json() as { content: string; mentionIds?: string[] };
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const wsIds = await getUserWorkspaceIds(session.user.id);
  const task = await prisma.task.findFirst({
    where: { id, workspaceId: { in: wsIds } },
    include: { property: { select: { name: true } } },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comment = await prisma.taskComment.create({
    data: { taskId: id, authorId: session.user.id, content: content.trim() },
    include: { author: { select: { id: true, name: true, image: true } } },
  });

  if (mentionIds && mentionIds.length > 0 && process.env.RESEND_API_KEY) {
    sendCommentMentionEmails(
      comment,
      task as { id: string; content: string; property: { name: string } | null },
      session.user.name ?? session.user.email,
      mentionIds,
    ).catch(() => {});
  }

  return NextResponse.json(comment, { status: 201 });
}

async function sendCommentMentionEmails(
  comment: { id: string; content: string },
  task: { id: string; content: string; property: { name: string } | null },
  authorName: string,
  mentionIds: string[],
) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL ?? "info@smartstay.ba";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.smartstay.ba";

  const users = await prisma.user.findMany({
    where: { id: { in: mentionIds } },
    select: { email: true, name: true },
  });

  for (const user of users) {
    const taskPreview = task.content.length > 80 ? task.content.slice(0, 80) + "…" : task.content;
    const commentPreview = comment.content.length > 120 ? comment.content.slice(0, 120) + "…" : comment.content;
    const propertyLine = task.property
      ? `<p style="margin:0 0 16px;font-size:13px;color:#6B6B6B;">🏠 ${task.property.name}</p>`
      : "";

    await resend.emails.send({
      from,
      to: user.email,
      subject: `${authorName} te je označio/la u komentaru`,
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
            ${authorName} te je označio/la u komentaru
          </p>
          ${propertyLine}
          <p style="margin:0 0 8px;font-size:12px;color:#9B9B9B;text-transform:uppercase;letter-spacing:0.5px;">Poruka</p>
          <div style="background:#F7F7F5;border-radius:10px;padding:12px 16px;margin-bottom:12px;border-left:3px solid #EDEDE9;">
            <p style="margin:0;font-size:13px;color:#6B6B6B;line-height:1.5;">${taskPreview}</p>
          </div>
          <p style="margin:0 0 8px;font-size:12px;color:#9B9B9B;text-transform:uppercase;letter-spacing:0.5px;">Komentar</p>
          <div style="background:#F7F7F5;border-radius:10px;padding:16px;margin-bottom:28px;border-left:3px solid #0F2F61;">
            <p style="margin:0;font-size:15px;color:#262626;line-height:1.6;">${commentPreview}</p>
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
