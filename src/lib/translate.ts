import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const LANGUAGES = ["BS", "DE", "TR", "IT"] as const;

const SKIP_FIELDS = new Set([
  "checkIn", "checkOut", "network", "password", "mapUrl",
  "phone", "url", "photoUrl", "videoUrl", "photos",
  "available", "paid", "parkingType", "checkInType", "images",
]);

function extractTranslatableText(content: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(content)) {
    if (SKIP_FIELDS.has(key)) continue;
    if (typeof value === "string" && value.trim()) result[key] = value;
    // links (CUSTOM sections, e.g. "Our apartments"): names/descriptions are translated, urls kept
    if ((key === "rules" || key === "places" || key === "links") && Array.isArray(value) && value.length) {
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
    if (key === "rules" || key === "places" || key === "links") {
      try { result[key] = JSON.parse(value); } catch { result[key] = value; }
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Translates the given sections of a property into BS/DE/TR/IT in one Claude call and upserts the
 * SectionTranslation rows. Returns the number of sections handled; throws if the translation fails.
 * Caller is responsible for access checks.
 */
export async function translateSections(propertyId: string, sectionIds: string[]): Promise<number> {
  if (sectionIds.length === 0) return 0;

  const sections = await prisma.section.findMany({
    where: { id: { in: sectionIds }, propertyId },
  });

  const sectionTextMap: Record<string, Record<string, string>> = {};
  for (const section of sections) {
    const text = extractTranslatableText(section.content as Record<string, unknown>);
    if (Object.keys(text).length > 0) sectionTextMap[section.id] = text;
  }

  const sectionsToTranslate = Object.entries(sectionTextMap);
  if (sectionsToTranslate.length === 0) return 0;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are a professional translator for a property management guest guide app.
Translate the following sections (written in English or Bosnian) into Bosnian (BS, Latin script), German (DE), Turkish (TR), and Italian (IT).
If a field is already in the target language, return it unchanged for that language.
Return ONLY a valid JSON object with this exact structure:
{
  "sectionId1": {
    "BS": { ...translated fields },
    "DE": { ...translated fields },
    "TR": { ...translated fields },
    "IT": { ...translated fields }
  },
  "sectionId2": { ... }
}

Rules:
- Translate naturally for a hospitality/accommodation context
- For "rules", "places" and "links" fields that are JSON array strings, translate text inside array items and return as JSON array strings; never change "url" or "link" values
- Keep proper nouns, brand names, place names where appropriate
- Return ONLY the JSON, no explanation

Sections to translate:
${JSON.stringify(Object.fromEntries(sectionsToTranslate), null, 2)}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 16000, // many sections × 4 languages — 4000 cut the JSON off
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in response");
  const translations: Record<string, Record<string, Record<string, string>>> = JSON.parse(jsonMatch[0]);

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
  return sections.length;
}
