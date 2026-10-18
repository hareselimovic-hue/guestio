"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeleteRegistrationButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this registration? This cannot be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/registrations/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert("Delete failed.");
  }

  return (
    <button
      onClick={handleDelete}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
    >
      <Trash2 className="w-3.5 h-3.5" />
      Delete
    </button>
  );
}
