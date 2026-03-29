import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds } from "@/lib/workspace";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const LANGUAGES = ["DE", "TR", "IT"] as const;
const LANGUAGE_NAMES: Record<string, string> = {
  DE: "German",
  TR: "Turkish",
  IT: "Italian",
};

// Fields that should NOT be translated
const SKIP_FIELDS = new Set(["checkIn", "checkOut", "network", "password", "mapUrl", "phone", "url", "photoUrl", "videoUrl", "photos", "available", "paid", "parkingType", "checkInType", "links"]);

function extractTranslatableText(content: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(content)) {
    if (SKIP_FIELDS.has(key)) continue;
    if (typeof value === "string" && value.trim()) {
      result[key] = value;
    }
    // Handle rules array (HOUSE_RULES)
    if (key === "rules" && Array.isArray(value)) {
      result["rules"] = JSON.stringify(value);
    }
    // Handle places array (LOCAL_RECS)
    if (key === "places" && Array.isArray(value)) {
      result["places"] = JSON.stringify(value);
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

  const { id } = await params;

  const wsIds = await getUserWorkspaceIds(session.user.id);
  const accessFilter = wsIds.length > 0
    ? { OR: [{ workspaceId: { in: wsIds } }, { userId: session.user.id, workspaceId: null }] }
    : { userId: session.user.id };

  const section = await prisma.section.findFirst({
    where: { id, property: accessFilter },
  });
  if (!section) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const content = section.content as Record<string, unknown>;
  const translatableText = extractTranslatableText(content);

  if (Object.keys(translatableText).length === 0) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are a professional translator for a property management guest guide app.
Translate the following JSON fields from English to all three target languages.
Return ONLY a valid JSON object with this structure:
{
  "DE": { ...translated fields in German },
  "TR": { ...translated fields in Turkish },
  "IT": { ...translated fields in Italian }
}

Rules:
- Translate naturally and professionally for a hospitality/accommodation context
- For "rules" and "places" fields that contain JSON arrays as strings, translate the text content inside the array items and return them as JSON array strings
- Keep proper nouns, brand names, place names in original form where appropriate
- Do not add any explanation, just return the JSON

Fields to translate:
${JSON.stringify(translatableText, null, 2)}`;

  let translations: Record<string, Record<string, string>>;
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    translations = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("Translation failed:", e);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }

  // Upsert all 3 translations
  await Promise.all(
    LANGUAGES.map((lang) => {
      const translatedContent = applyTranslation(content, translations[lang] ?? {});
      return prisma.sectionTranslation.upsert({
        where: { sectionId_language: { sectionId: id, language: lang } },
        create: { sectionId: id, language: lang, content: translatedContent },
        update: { content: translatedContent },
      });
    })
  );

  return NextResponse.json({ ok: true });
}
