"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED: Record<string, string[]> = {
  EN: ["What's the WiFi password?", "What time is check-out?", "Where can I park?"],
  DE: ["Was ist das WLAN-Passwort?", "Wann ist Check-out?", "Wo kann ich parken?"],
  TR: ["WiFi şifresi nedir?", "Check-out saati nedir?", "Nereye park edebilirim?"],
  IT: ["Qual è la password WiFi?", "A che ora è il check-out?", "Dove posso parcheggiare?"],
};

interface Props {
  propertySlug: string;
  token: string;
  lang: string;
}

export default function GuestChat({ propertySlug, token, lang }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Adjust panel position when virtual keyboard opens on mobile
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;

    const adjust = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const offsetBottom = window.innerHeight - vv.height - vv.offsetTop;
      panel.style.bottom = `${Math.max(0, offsetBottom)}px`;
    };

    vv.addEventListener("resize", adjust);
    vv.addEventListener("scroll", adjust);
    return () => {
      vv.removeEventListener("resize", adjust);
      vv.removeEventListener("scroll", adjust);
      if (panelRef.current) panelRef.current.style.bottom = "";
    };
  }, [open]);

  async function send(question?: string) {
    const q = (question ?? input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: propertySlug, token, question: q, lang }),
      });

      if (!res.ok || !res.body) throw new Error("Failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: updated[updated.length - 1].content + text,
          };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  const suggested = SUGGESTED[lang] ?? SUGGESTED.EN;

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#FF6700] hover:bg-[#e05c00] text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div ref={panelRef} className="fixed bottom-0 left-0 right-0 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[360px] z-50 bg-white sm:rounded-2xl shadow-2xl border border-[#EDEDE9] flex flex-col overflow-hidden"
          style={{ height: 500, maxHeight: "85vh" }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#EDEDE9] bg-white shrink-0">
            <div className="w-8 h-8 bg-[#FF6700] rounded-full flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[#262626]" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>
                Ask your host assistant
              </p>
              <p className="text-xs text-[#9B9B9B]">Powered by AI · answers in seconds</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-[#6B6B6B] hover:text-[#262626] transition-colors shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 ? (
              <div className="py-4">
                <p className="text-sm text-[#6B6B6B] text-center mb-4">
                  Ask me anything about your stay!
                </p>
                <div className="space-y-2">
                  {suggested.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="w-full text-left text-sm bg-[#F7F7F5] hover:bg-[#EDEDE9] px-4 py-2.5 rounded-xl text-[#262626] transition-colors border border-[#EDEDE9]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-[#FF6700] text-white rounded-br-sm"
                        : "bg-[#F7F7F5] text-[#262626] rounded-bl-sm"
                    }`}
                  >
                    {msg.content || (loading && i === messages.length - 1
                      ? <Loader2 className="w-4 h-4 animate-spin text-[#9B9B9B]" />
                      : null
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-[#EDEDE9] bg-white shrink-0">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Type a question..."
                disabled={loading}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-[#EDEDE9] focus:outline-none focus:border-[#FF6700] transition-colors disabled:opacity-50 bg-[#F7F7F5]"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="w-10 h-10 bg-[#FF6700] hover:bg-[#e05c00] disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
