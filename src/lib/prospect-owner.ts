/** Where the full editor of a ready-made guide lives (hotel panel for hotels). */
export function editorHref(p: { id: string; kind: string }) {
  return p.kind === "HOTEL" ? `/dashboard/hotel?property=${p.id}` : `/dashboard/properties/${p.id}`;
}
