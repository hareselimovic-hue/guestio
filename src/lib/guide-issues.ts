/** Gaps in an apartment guide a guest would notice (shared by Dashboard and Apartments list) */
export type SectionLite = { type: string; content: unknown; isVisible: boolean; _count: { translations: number } };

export function guideIssues(sections: SectionLite[]): string[] {
  const get = (type: string) => sections.find((s) => s.type === type);
  const c = (type: string) => ((get(type)?.content ?? {}) as Record<string, unknown>);
  const visible = (type: string) => !!get(type)?.isVisible;
  const issues: string[] = [];
  if (visible("WIFI") && (!c("WIFI").network || !c("WIFI").password)) issues.push("Wi-Fi details missing");
  if (visible("CHECKIN") && !c("CHECKIN").instructions) issues.push("no check-in instructions");
  if (visible("CONTACT") && !c("CONTACT").phone) issues.push("no contact phone");
  if (sections.every((s) => s._count.translations === 0)) issues.push("not translated (guests see English only)");
  return issues;
}

/** Photo for the list: cover image, else the Welcome section's hero image */
export function guideThumb(coverImage: string | null, sections: { type: string; content: unknown }[]): string | null {
  if (coverImage) return coverImage;
  const hero = (sections.find((s) => s.type === "WELCOME")?.content as Record<string, unknown> | undefined)?.heroImage;
  return typeof hero === "string" && hero ? hero : null;
}
