import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GuestRegistrationForm from "@/components/GuestRegistrationForm";

export const dynamic = "force-dynamic";

export default async function GuestRegistrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { slug } = await params;
  const { from } = await searchParams;

  const property = await prisma.property.findUnique({
    where: { slug },
    select: { name: true, slug: true, guestRegistrationEnabled: true },
  });
  if (!property?.guestRegistrationEnabled) notFound();

  // "from" is the guide token the guest came from (shared links use "preview")
  const backToken = from && /^[a-z0-9]+$/i.test(from) ? from : "preview";

  return (
    <GuestRegistrationForm
      propertyName={property.name}
      slug={property.slug}
      backHref={`/g/${property.slug}/${backToken}`}
    />
  );
}
