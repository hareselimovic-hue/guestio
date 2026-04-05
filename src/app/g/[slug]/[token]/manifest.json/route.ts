import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; token: string }> }
) {
  const { slug, token } = await params;
  const startUrl = `/g/${slug}/${token}`;

  return NextResponse.json({
    name: "SmartStay — Guest Guide",
    short_name: "SmartStay",
    description: "Your digital apartment guide — works offline too",
    start_url: startUrl,
    scope: startUrl,
    display: "standalone",
    orientation: "portrait",
    theme_color: "#0F2F61",
    background_color: "#ffffff",
    icons: [
      { src: "/icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon?size=512", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  });
}
