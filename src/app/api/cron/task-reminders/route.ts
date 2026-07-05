import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: { status: "IN_PROGRESS" },
    include: {
      author: { select: { id: true, name: true, email: true } },
      property: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (tasks.length === 0) {
    return NextResponse.json({ sent: 0, message: "No IN_PROGRESS tasks" });
  }

  const allMentionIds = [...new Set(tasks.flatMap((t) => t.mentionIds))];
  const mentionedUsers =
    allMentionIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: allMentionIds } },
          select: { id: true, email: true, name: true },
        })
      : [];

  const mentionedUserMap = new Map(mentionedUsers.map((u) => [u.id, u]));

  type TaskItem = (typeof tasks)[0];
  type Recipient = { email: string; name: string; tasks: TaskItem[] };
  const recipientMap = new Map<string, Recipient>();

  function addTask(userId: string, email: string, name: string, task: TaskItem) {
    if (!recipientMap.has(userId)) {
      recipientMap.set(userId, { email, name, tasks: [] });
    }
    const rec = recipientMap.get(userId)!;
    if (!rec.tasks.find((t) => t.id === task.id)) {
      rec.tasks.push(task);
    }
  }

  for (const task of tasks) {
    addTask(task.authorId, task.author.email, task.author.name, task);
    for (const mentionId of task.mentionIds) {
      const user = mentionedUserMap.get(mentionId);
      if (user) addTask(user.id, user.email, user.name, task);
    }
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@smartstay.ba";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.smartstay.ba";

  let sentCount = 0;
  const errors: string[] = [];

  for (const [, recipient] of recipientMap) {
    try {
      await resend.emails.send({
        from,
        to: recipient.email,
        subject: `Podsjetnik: imaš ${recipient.tasks.length} aktivnih zadataka — SmartStay`,
        html: buildReminderEmail(recipient.name, recipient.tasks, appUrl),
      });
      sentCount++;
    } catch (err) {
      errors.push(`${recipient.email}: ${String(err)}`);
    }
  }

  return NextResponse.json({
    sent: sentCount,
    totalRecipients: recipientMap.size,
    ...(errors.length > 0 && { errors }),
  });
}

function buildReminderEmail(
  recipientName: string,
  tasks: Array<{
    content: string;
    property: { name: string } | null;
    author: { name: string };
  }>,
  appUrl: string
): string {
  const taskRows = tasks
    .map((task) => {
      const preview =
        task.content.length > 100 ? task.content.slice(0, 100) + "…" : task.content;
      const propertyBadge = task.property
        ? `<span style="font-size:11px;color:#6B6B6B;background:#F0F0EC;padding:2px 8px;border-radius:20px;margin-left:8px;">🏠 ${task.property.name}</span>`
        : "";
      return `
      <div style="padding:14px 0;border-bottom:1px solid #EDEDE9;">
        <div style="margin-bottom:6px;">
          <span style="display:inline-block;width:8px;height:8px;background:#FF6700;border-radius:50%;margin-right:6px;vertical-align:middle;"></span>
          <span style="font-size:12px;font-weight:600;color:#FF6700;text-transform:uppercase;letter-spacing:0.5px;vertical-align:middle;">U tijeku</span>
          ${propertyBadge}
        </div>
        <p style="margin:0 0 4px;font-size:14px;color:#262626;line-height:1.5;">${preview}</p>
        <p style="margin:0;font-size:12px;color:#9B9B95;">od: ${task.author.name}</p>
      </div>`;
    })
    .join("");

  const taskWord = tasks.length === 1 ? "aktivni zadatak" : "aktivnih zadataka";

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
          <p style="margin:0 0 6px;font-size:13px;color:#FF6700;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Team Channel</p>
          <p style="margin:0 0 6px;font-size:24px;font-weight:700;color:#262626;line-height:1.25;">Podsjetnik na zadatke</p>
          <p style="margin:0 0 28px;font-size:15px;color:#6B6B6B;">
            Zdravo ${recipientName}, imaš <strong style="color:#0F2F61;">${tasks.length} ${taskWord}</strong> koji čekaju na rješavanje.
          </p>
          <div style="background:#FAFAF8;border-radius:10px;padding:0 16px;margin-bottom:28px;">
            ${taskRows}
            <div style="padding:14px 0 0;"></div>
          </div>
          <a href="${appUrl}/dashboard/team"
             style="display:block;text-align:center;background:#0F2F61;color:#fff;font-size:15px;
                    font-weight:600;padding:14px 28px;border-radius:10px;text-decoration:none;">
            Otvori Team Channel →
          </a>
        </td></tr>
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#BABAB5;">
            SmartStay — Digital guest guidebooks<br>
            Dobivate ovu poruku jer ste autor ili ste označeni u aktivnom zadatku.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
