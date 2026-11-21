import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_EMAIL } from "@/lib/features";
import { guideChecklist } from "@/lib/guide-request";
import { prospectFields } from "@/lib/prospect-edit";
import GuideRequestReview from "@/components/GuideRequestReview";

export const dynamic = "force-dynamic";

/** Admin: review + fill in one ready-made guide (linked from the outreach morning email as "Uredi"). */
export default async function ProspectGuidePage({ params }: { params: Promise<{ token: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.email !== ADMIN_EMAIL) redirect("/dashboard");
  const { token } = await params;
  const p = await prisma.property.findFirst({
    where: { prospectToken: token },
    select: { id: true, name: true, kind: true, prospectEmail: true, prospectSource: true, prospectViews: true, prospectExpiresAt: true, internalName: true },
  });
  const checklist = p ? await guideChecklist(p.id) : null;
  const fields = p ? await prospectFields(p.id) : null;
  const fromSite = p?.internalName?.startsWith("Sa sajta");

  return (
    <GuideRequestReview
      info={{
        eyebrow: `${fromSite ? "Vodič sa sajta" : "Outreach vodič"}${p?.kind === "HOTEL" ? " · hotel" : ""}${p ? ` · ${p.prospectViews} otvaranja` : ""}`,
        title: p?.name ?? "Vodič", email: p?.prospectEmail ?? "", source: p?.prospectSource ?? null,
        note: p?.prospectExpiresAt ? `Briše se automatski ${p.prospectExpiresAt.toLocaleDateString("bs-BA", { timeZone: "Europe/Sarajevo" })} ako ga vlasnik ne preuzme.` : null,
        back: { href: "/dashboard/vodici", label: "Svi pripremljeni vodiči" },
      }}
      guide={checklist ? { name: checklist.name, url: checklist.url, have: checklist.have } : null}
      fields={fields ?? { welcome: "", wifiNetwork: "", wifiPassword: "", checkIn: "", checkOut: "", instructions: "", phone: "" }}
      patchUrl={`/api/prospects/edit/${token}`}
      approve={null}
      emptyNote="Vodič više nije dostupan: vlasnik ga je preuzeo ili je istekao."
    />
  );
}
