"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

/** Marks an unanswered guest question as handled and refreshes the Analytics page */
export default function ResolveQuestionButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await fetch(`/api/chat-questions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolved: true }),
        }).catch(() => null);
        if (res?.ok) router.refresh();
        else setBusy(false);
      }}
      className="inline-flex items-center gap-1 text-xs font-medium text-ink-2 hover:text-ink border border-line bg-white px-2.5 py-1.5 rounded-lg disabled:opacity-50"
      title="Mark as handled"
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
      Done
    </button>
  );
}
