import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_EMAIL } from "@/lib/features";
import { guideChecklist } from "@/lib/guide-request";
import { TODO } from "@/lib/prospect-create";
import GuideRequestReview from "@/components/GuideRequestReview";

export const dynamic = "force-dynamic";

export default async function GuideRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.email !== ADMIN_EMAIL) redirect("/dashboard");
  const { id } = await params;
  const gr = await prisma.guideRequest.findUnique({ where: { id } });
  if (!gr) notFound();

  const checklist = gr.propertyId ? await guideChecklist(gr.propertyId) : null;
  const sections = gr.propertyId
    ? await prisma.section.findMany({ where: { propertyId: gr.propertyId, type: { in: ["WELCOME", "WIFI", "CHECKIN", "CONTACT"] } }, select: { type: true, content: true } })
    : [];
  const val = (type: string, key: string) => {
    const v = (sections.find((s) => s.type === type)?.content as Record<string, unknown> | undefined)?.[key];
    return typeof v === "string" && v !== TODO ? v : "";
  };

  return (
    <GuideRequestReview
      request={{
        id: gr.id, email: gr.email, url: gr.url, platform: gr.platform, kind: gr.kind, status: gr.status,
        error: gr.error, sentAt: gr.sentAt?.toISOString() ?? null, createdAt: gr.createdAt.toISOString(),
      }}
      guide={checklist ? { name: checklist.name, url: checklist.url, have: checklist.have } : null}
      fields={{
        welcome: val("WELCOME", "message"), wifiNetwork: val("WIFI", "network"), wifiPassword: val("WIFI", "password"),
        checkIn: val("CHECKIN", "checkIn"), checkOut: val("CHECKIN", "checkOut"), instructions: val("CHECKIN", "instructions"),
        phone: val("CONTACT", "phone"),
      }}
    />
  );
}
