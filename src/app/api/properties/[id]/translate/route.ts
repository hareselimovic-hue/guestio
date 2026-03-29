import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds } from "@/lib/workspace";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const LANGUAGES = ["DE", "TR", "IT"] as const;

const SKIP_FIELDS = new Set([
  "checkIn", "checkOut", "network", "password", "mapUrl",
  "phone", "url", "photoUrl", "videoUrl", "photos",
  "available", "paid", "parkingType", "checkInType", "links",
]);

function extractTranslatableText(content: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(content)) {
    if (SKIP_FIELDS.has(key)) continue;
    if (typeof value === "string" && value.trim()) result[key] = value;
    if ((key === "rules" || key === "places") && Array.isArray(value)) {
      result[key] = JSON.stringify(value);
    }
  }
  return result;
}

function applyTranslation(
  original: Record<string, unknown>,
  translated: Record<string, string>
): Record<string, unknown> {
  const result = { ...original };
  for (const [key, value] of Object.entries(translated)) {
    if (key === "rules" || key === "places") {
      try { result[key] = JSON.parse(value); } catch { result[key] = value; }
    } else {
      result[key] = value;
    }
  }
  return result;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: propertyId } = await params;
  const body = await req.json();
  const sectionIds: string[] = body.sectionIds ?? [];

  if (sectionIds.length === 0) return NextResponse.json({ ok: true, count: 0 });

  const wsIds = await getUserWorkspaceIds(session.user.id);
  const accessFilter = wsIds.length > 0
    ? { OR: [{ workspaceId: { in: wsIds } }, { userId: session.user.id, workspaceId: null }] }
    : { userId: session.user.id };

  const property = await prisma.property.findFirst({
    where: { id: propertyId, ...accessFilter },
  });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch all dirty sections
  const sections = await prisma.section.findMany({
    where: { id: { in: sectionIds }, propertyId },
  });

  // Build a map of translatable text per section
  const sectionTextMap: Record<string, Record<string, string>> = {};
  for (const section of sections) {
    const text = extractTranslatableText(section.content as Record<string, unknown>);
    if (Object.keys(text).length > 0) sectionTextMap[section.id] = text;
  }

  const sectionsToTranslate = Object.entries(sectionTextMap);
  if (sectionsToTranslate.length === 0) return NextResponse.json({ ok: true, count: 0 });

  // Single Claude API call for all sections
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are a professional translator for a property management guest guide app.
Translate the following sections from English to German (DE), Turkish (TR), and Italian (IT).
Return ONLY a valid JSON object with this exact structure:
{
  "sectionId1": {
    "DE": { ...translated fields },
    "TR": { ...translated fields },
    "IT": { ...translated fields }
  },
  "sectionId2": { ... }
}

Rules:
- Translate naturally for a hospitality/accommodation context
- For "rules" and "places" fields that are JSON array strings, translate text inside array items and return as JSON array strings
- Keep proper nouns, brand names, place names where appropriate
- Return ONLY the JSON, no explanation

Sections to translate:
${JSON.stringify(Object.fromEntries(sectionsToTranslate), null, 2)}`;

  let translations: Record<string, Record<string, Record<string, string>>>;
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    translations = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("Batch translation failed:", e);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }

  // Upsert translations for each section
  const upserts = [];
  for (const section of sections) {
    const sectionTranslations = translations[section.id];
    if (!sectionTranslations) continue;
    const originalContent = section.content as Record<string, unknown>;

    for (const lang of LANGUAGES) {
      const translatedContent = applyTranslation(originalContent, sectionTranslations[lang] ?? {});
      upserts.push(
        prisma.sectionTranslation.upsert({
          where: { sectionId_language: { sectionId: section.id, language: lang } },
          create: { sectionId: section.id, language: lang, content: translatedContent as never },
          update: { content: translatedContent as never },
        })
      );
    }
  }

  await Promise.all(upserts);
  return NextResponse.json({ ok: true, count: sections.length });
}
