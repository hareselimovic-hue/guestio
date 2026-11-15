import GuestPage, { generateMetadata as guideMetadata } from "./[token]/page";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return guideMetadata({ params: Promise.resolve({ slug, token: "preview" }) });
}

// /g/<slug> = the general (read-only) guide, same as /g/<slug>/preview
export default async function GeneralGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return GuestPage({ params: Promise.resolve({ slug, token: "preview" }) });
}
