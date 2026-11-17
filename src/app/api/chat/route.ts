import { NextRequest, after } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { NO_INFO_MARKER, classifyQuestion } from "@/lib/chat-topics";

export const runtime = "nodejs";

type Section = {
  type: string;
  title: string;
  content: unknown;
  translations?: { language: string; content: unknown }[];
};

function buildContext(propertyName: string, sections: Section[], lang: string): string {
  const lines: string[] = [`Property name: ${propertyName}\n`];

  for (const section of sections) {
    let content = section.content as Record<string, unknown>;
    if (lang !== "EN" && section.translations) {
      const t = section.translations.find((t) => t.language === lang);
      if (t) content = t.content as Record<string, unknown>;
    }

    switch (section.type) {
      case "WIFI":
        if (content.network) lines.push(`WiFi network: ${content.network}`);
        if (content.password) lines.push(`WiFi password: ${content.password}`);
        if (content.note) lines.push(`WiFi note: ${content.note}`);
        break;

      case "CHECKIN":
        lines.push(`Check-in time: ${content.checkIn || "15:00"}`);
        lines.push(`Check-out time: ${content.checkOut || "11:00"}`);
        if (content.instructions) lines.push(`Check-in instructions: ${content.instructions}`);
        if (content.checkOutInstructions) lines.push(`Check-out instructions: ${content.checkOutInstructions}`);
        break;

      case "HOUSE_RULES": {
        const rules = (content.rules as string[]) ?? [];
        if (rules.length > 0) lines.push(`House rules:\n${rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}`);
        break;
      }

      case "LOCATION":
        if (content.address) lines.push(`Address: ${content.address}`);
        if (content.directions) lines.push(`Directions to property: ${content.directions}`);
        break;

      case "LOCAL_RECS": {
        const places = (content.places as { name: string; category: string; description: string }[]) ?? [];
        if (places.length > 0) {
          lines.push(`Local recommendations:\n${places.map((p) => `- ${p.name} (${p.category}): ${p.description}`).join("\n")}`);
        }
        break;
      }

      case "CONTACT":
        if (content.phone) lines.push(`Host contact: ${content.phone}${content.label ? ` (${content.label})` : ""}`);
        break;

      case "PARKING":
        lines.push(`Parking available: ${content.available ? "Yes" : "No"}`);
        if (content.parkingType) lines.push(`Parking type: ${content.parkingType}`);
        if (content.paid !== undefined) lines.push(`Parking cost: ${content.paid ? "Paid" : "Free"}`);
        if (content.notes) lines.push(`Parking notes: ${content.notes}`);
        break;

      case "WELCOME":
        if (content.message) lines.push(`Welcome message: ${content.message}`);
        if (content.hostName) lines.push(`Host name: ${content.hostName}`);
        break;

      case "AI_CONTEXT":
        if (content.body) lines.push(`Additional property info:\n${content.body}`);
        break;

      default:
        if (content.body) lines.push(`${section.title}: ${content.body}`);
        break;
    }
  }

  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  const { slug, token, question, lang = "EN" } = await req.json();

  if (!slug || !token || !question?.trim()) {
    return new Response("Bad request", { status: 400 });
  }

  const property = await prisma.property.findUnique({
    where: { slug },
    include: {
      sections: {
        where: { isVisible: true },
        include: { translations: true },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!property) return new Response("Not found", { status: 404 });

  if (token !== "preview") {
    const guestLink = await prisma.guestLink.findUnique({ where: { token } });
    if (!guestLink || guestLink.propertyId !== property.id) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const context = buildContext(property.name, property.sections, lang);

  // Track chat usage (fire and forget)
  prisma.property.update({
    where: { id: property.id },
    data: { chatCount: { increment: 1 } },
  }).catch(() => {});

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const encoder = new TextEncoder();

  let full = "";
  let noInfo = false;
  let ok = false;

  // After the reply is sent: keep the question for Analytics (what guests ask, what the guide is missing)
  after(async () => {
    if (!ok) return;
    const answer = full.replace(NO_INFO_MARKER, "").trim();
    try {
      const topic = await classifyQuestion(question);
      await prisma.chatQuestion.create({
        data: { propertyId: property.id, question: String(question).trim().slice(0, 1000), answer: answer.slice(0, 2000), lang, answered: !noInfo, topic },
      });
    } catch (err) {
      console.error("[chat] saving question failed:", err);
    }
  });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 512,
          system: [
            {
              type: "text",
              text: `You are a friendly guest assistant for "${property.name}". Answer questions using ONLY the information below. Be concise (2-4 sentences max). Write plain text only: no Markdown, asterisks, headings or bullet symbols. The check-in time is the earliest time the guest can arrive, not the only one, so never say check-in is over or too late; for a late or night arrival, explain how to get in from the check-in instructions. Don't add the host's phone number to an answer you could give from the information below. If something isn't covered, start your reply with the exact text ${NO_INFO_MARKER} (it is hidden from the guest), then say you don't have that info and suggest contacting the host directly. Use ${NO_INFO_MARKER} only when the information below does not answer the question. Respond in the same language the guest uses.\n\n---\n${context}\n---`,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: question }],
        });

        // Hold back the first characters until we know whether the answer starts with the hidden marker
        let pending = "";
        let decided = false;
        let stripLead = false;
        for await (const event of stream) {
          if (event.type !== "content_block_delta" || event.delta.type !== "text_delta") continue;
          full += event.delta.text;
          if (decided) {
            // right after the hidden marker the model usually sends a space — don't show it
            const text = stripLead ? event.delta.text.trimStart() : event.delta.text;
            if (text) { stripLead = false; controller.enqueue(encoder.encode(text)); }
            continue;
          }
          pending += event.delta.text;
          const trimmed = pending.trimStart();
          if (trimmed.length < NO_INFO_MARKER.length && NO_INFO_MARKER.startsWith(trimmed)) continue;
          decided = true;
          if (trimmed.startsWith(NO_INFO_MARKER)) { noInfo = true; pending = trimmed.slice(NO_INFO_MARKER.length).trimStart(); stripLead = !pending; }
          if (pending) controller.enqueue(encoder.encode(pending));
        }
        if (!decided && pending.trim() && !pending.trim().startsWith(NO_INFO_MARKER.slice(0, pending.trim().length))) {
          controller.enqueue(encoder.encode(pending));
        }
        ok = true;
      } catch {
        controller.enqueue(encoder.encode("Sorry, something went wrong. Please try again."));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
