import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_EMAIL } from "@/lib/features";
import { guideChecklist } from "@/lib/guide-request";
import { prospectFields } from "@/lib/prospect-edit";
import GuideRequestReview from "@/components/GuideRequestReview";
import { editorHref } from "@/lib/prospect-owner";

export const dynamic = "force-dynamic";

const PLATFORM: Record<string, string> = { AIRBNB: "Airbnb", BOOKING: "Booking", WEBSITE: "Sajt" };

export default async function GuideRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.email !== ADMIN_EMAIL) redirect("/dashboard");
  const { id } = await params;
  const gr = await prisma.guideRequest.findUnique({ where: { id } });
  if (!gr) notFound();

  const checklist = gr.propertyId ? await guideChecklist(gr.propertyId) : null;
  const fields = gr.propertyId ? await prospectFields(gr.propertyId) : null;
  const prop = gr.propertyId ? await prisma.property.findUnique({ where: { id: gr.propertyId }, select: { id: true, kind: true, prospectToken: true } }) : null;

  return (
    <GuideRequestReview
      info={{
        eyebrow: `Vodič iz linka · ${PLATFORM[gr.platform] ?? gr.platform}${gr.kind === "HOTEL" ? " · hotel" : ""}`,
        title: gr.email, email: gr.email, source: gr.url, note: gr.error,
        back: { href: "/dashboard/guide-requests", label: "Svi zahtjevi" },
      }}
      guide={checklist ? { name: checklist.name, url: checklist.url, have: checklist.have } : null}
      fields={fields ?? { welcome: "", wifiNetwork: "", wifiPassword: "", checkIn: "", checkOut: "", instructions: "", phone: "" }}
      patchUrl={`/api/guide-request/${gr.id}`}
      approve={{ url: `/api/guide-request/${gr.id}/approve`, sent: !!gr.sentAt }}
      emptyNote={gr.status === "FAILED"
        ? "Vodič nije napravljen automatski. Napravi ga ručno (outreach agent / create_guide.py) ili se javi posjetiocu."
        : "Vodič se još pravi. Osvježi stranicu za minut."}
      editorHref={prop?.prospectToken ? editorHref(prop) : null}
    />
  );
}
