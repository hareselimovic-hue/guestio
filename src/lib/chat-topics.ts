import Anthropic from "@anthropic-ai/sdk";

/** Fixed topics, so questions in any language group together on the Analytics page */
export const CHAT_TOPICS: Record<string, string> = {
  WIFI: "Wi-Fi",
  CHECKIN: "Check-in & keys",
  CHECKOUT: "Check-out",
  PARKING: "Parking",
  DIRECTIONS: "Directions & transport",
  FOOD: "Food & restaurants",
  ACTIVITIES: "Things to do",
  RULES: "House rules",
  AMENITIES: "Amenities & appliances",
  CLEANING: "Cleaning, towels & linen",
  PAYMENT: "Payment & invoices",
  OTHER: "Other",
};

const TOPIC_GUIDE = [
  "WIFI — internet, Wi-Fi network or password",
  "CHECKIN — arrival, check-in time, keys, door codes, getting into the building",
  "CHECKOUT — departure, check-out time, late check-out, leaving the keys, luggage after check-out",
  "PARKING — parking, garage, car",
  "DIRECTIONS — address, how to get there, taxi, airport, bus, transport",
  "FOOD — restaurants, cafés, breakfast, shops, delivery",
  "ACTIVITIES — sights, tours, things to do, nightlife, nearby places like gyms or beaches",
  "RULES — house rules, smoking, pets, visitors, noise, parties",
  "AMENITIES — appliances and equipment in the room: TV, AC, heating, washing machine, kitchen, hair dryer, iron",
  "CLEANING — cleaning, towels, bed linen, rubbish",
  "PAYMENT — prices, payment, deposit, invoice, tourist tax",
  "OTHER — anything else",
].join("\n");

/** Marker the assistant puts at the very start of an answer when the guide doesn't cover the question */
export const NO_INFO_MARKER = "[NOINFO]";

/** One cheap call: which topic is this guest question about? Falls back to OTHER. */
export async function classifyQuestion(question: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return "OTHER";
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [{
        role: "user",
        content: `A hotel or apartment guest asked this (any language):\n"${question.slice(0, 500)}"\n\nWhich topic is it? Reply with the code only.\n${TOPIC_GUIDE}`,
      }],
    });
    const text = res.content[0]?.type === "text" ? res.content[0].text.trim().toUpperCase() : "";
    const code = Object.keys(CHAT_TOPICS).find((k) => text.startsWith(k));
    return code ?? "OTHER";
  } catch (err) {
    console.error("[chat] topic classification failed:", err);
    return "OTHER";
  }
}
