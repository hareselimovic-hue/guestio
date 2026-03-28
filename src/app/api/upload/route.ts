import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/mov"];

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const isImage = IMAGE_TYPES.includes(file.type);
  const isVideo = VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Only images (JPG, PNG, WEBP) and videos (MP4, MOV, WEBM) allowed" }, { status: 400 });
  }

  const maxSize = isVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: isVideo ? "Max 100MB for videos" : "Max 5MB for images" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? (isVideo ? "mp4" : "jpg");
  const filename = `${randomUUID()}.${ext}`;

  const blob = await put(filename, file, { access: "public" });

  return NextResponse.json({ url: blob.url });
}
