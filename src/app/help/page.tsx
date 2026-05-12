import { Brain, MessageCircle, Globe, Lock, Lightbulb, ChevronRight } from "lucide-react";

export const metadata = {
  title: "AI Guest Assistant — Help | SmartStay",
  description: "Learn how to set up and use the AI guest assistant on your SmartStay guidebook.",
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#F7F7F5]" style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}>

      {/* Header */}
      <div className="bg-[#0F2F61] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#FF6700] rounded-xl flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-[#8ba3c7] text-sm font-medium uppercase tracking-wide">Help & Knowledge Base</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">AI Guest Assistant</h1>
          <p className="text-[#8ba3c7] text-lg leading-relaxed max-w-xl">
            Everything you need to know about setting up and using the AI chatbot on your guest guidebook.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12 space-y-8">

        {/* What is it */}
        <Card>
          <SectionHeading icon={<MessageCircle className="w-5 h-5" />} color="bg-[#FF6700]">
            What is the AI Guest Assistant?
          </SectionHeading>
          <p className="text-[#6B6B6B] leading-relaxed mb-4">
            The AI Guest Assistant is a chat bubble that appears on your guest guidebook page. Guests can ask questions
            in natural language and receive instant answers — without calling or messaging you.
          </p>
          <p className="text-[#6B6B6B] leading-relaxed">
            The AI answers <strong className="text-[#262626]">only based on the information you've entered</strong> into
            your guidebook (WiFi, check-in, parking, rules, etc.). It never makes things up — if it doesn't know
            something, it tells the guest and suggests contacting you directly.
          </p>
        </Card>

        {/* How guests use it */}
        <Card>
          <SectionHeading icon={<ChevronRight className="w-5 h-5" />} color="bg-[#0F2F61]">
            How guests use it
          </SectionHeading>
          <ol className="space-y-4">
            {[
              { step: "1", text: "Guest opens their personalized guidebook link." },
              { step: "2", text: "An orange chat bubble appears in the bottom-right corner." },
              { step: "3", text: "Guest taps it and types a question — in any language." },
              { step: "4", text: "The AI responds immediately, streaming the answer in real time." },
            ].map(({ step, text }) => (
              <li key={step} className="flex items-start gap-4">
                <span className="w-7 h-7 rounded-full bg-[#FF6700] text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {step}
                </span>
                <p className="text-[#6B6B6B] leading-relaxed pt-0.5">{text}</p>
              </li>
            ))}
          </ol>
        </Card>

        {/* Languages */}
        <Card>
          <SectionHeading icon={<Globe className="w-5 h-5" />} color="bg-green-600">
            Supported languages
          </SectionHeading>
          <p className="text-[#6B6B6B] leading-relaxed mb-4">
            The AI automatically detects the language the guest writes in and responds in the same language.
            Guest interface suggestions are available in:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { flag: "🇬🇧", lang: "English" },
              { flag: "🇩🇪", lang: "Deutsch" },
              { flag: "🇹🇷", lang: "Türkçe" },
              { flag: "🇮🇹", lang: "Italiano" },
            ].map(({ flag, lang }) => (
              <div key={lang} className="bg-[#F7F7F5] rounded-xl p-3 text-center border border-[#EDEDE9]">
                <div className="text-2xl mb-1">{flag}</div>
                <p className="text-sm font-medium text-[#262626]">{lang}</p>
              </div>
            ))}
          </div>
          <p className="text-[#6B6B6B] text-sm mt-3">
            The AI can also respond in other languages — guests can write in their own language and it will follow.
          </p>
        </Card>

        {/* What the AI knows */}
        <Card>
          <SectionHeading icon={<Brain className="w-5 h-5" />} color="bg-violet-600">
            What the AI knows
          </SectionHeading>
          <p className="text-[#6B6B6B] leading-relaxed mb-4">
            The AI has access to all <strong className="text-[#262626]">visible sections</strong> of your guidebook:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              "Welcome message", "WiFi credentials", "Check-in / Check-out",
              "House rules", "Location & directions", "Local recommendations",
              "Contact info", "Parking", "Custom sections",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-[#6B6B6B]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6700] shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <p className="text-[#6B6B6B] text-sm mt-4">
            Hidden sections (visibility toggled off) are <strong className="text-[#262626]">not</strong> passed to the AI.
          </p>
        </Card>

        {/* AI Context */}
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
              <Brain className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="font-bold text-[#262626] text-lg mb-2">AI Context — the hidden section</h2>
              <p className="text-[#6B6B6B] leading-relaxed mb-4">
                In the section editor you'll find a special <strong className="text-[#262626]">AI Context</strong> button
                (purple, optional). This creates a section that is <strong className="text-[#262626]">completely invisible
                to guests</strong> but the AI reads it and uses it to give better answers.
              </p>
              <p className="text-[#6B6B6B] text-sm font-medium mb-2">Use it for things like:</p>
              <ul className="space-y-1.5">
                {[
                  "The key lockbox is behind the fire extinguisher on the left of the entrance",
                  "Pool access is with the white keycard, hours 08:00–22:00",
                  "Nearest pharmacy: 2 min walk, turn left out of the building",
                  "For emergencies, the building concierge is available 24/7 at reception",
                  "The washing machine instructions are on the fridge door",
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-sm text-[#6B6B6B]">
                    <span className="text-violet-500 mt-0.5 shrink-0">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Limitations */}
        <Card>
          <SectionHeading icon={<Lock className="w-5 h-5" />} color="bg-slate-600">
            Limitations
          </SectionHeading>
          <ul className="space-y-3">
            {[
              "The AI only knows what you've entered. It cannot browse the internet or answer general questions.",
              "Responses are kept short (2–4 sentences) to be mobile-friendly.",
              "If the AI doesn't have the answer, it says so and suggests the guest contacts you directly.",
              "The AI does not remember previous questions within a session — each question is independent.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[#6B6B6B]">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>
        </Card>

        {/* Tips */}
        <Card>
          <SectionHeading icon={<Lightbulb className="w-5 h-5" />} color="bg-amber-500">
            Tips for better AI answers
          </SectionHeading>
          <ul className="space-y-3">
            {[
              "Fill in as many guidebook sections as possible — more info means more accurate answers.",
              "Use the AI Context section for anything specific to your property that doesn't fit elsewhere.",
              "Be specific in your instructions — instead of \"check-out by morning\", write \"check-out by 11:00\".",
              "Add local recommendations with descriptions — the AI can suggest nearby restaurants, pharmacies, etc.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[#6B6B6B]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>
        </Card>

        {/* CTA */}
        <div className="bg-[#0F2F61] rounded-2xl p-8 text-center text-white">
          <p className="font-bold text-xl mb-2">Ready to set it up?</p>
          <p className="text-[#8ba3c7] mb-6 text-sm">Open your property editor and add the AI Context section.</p>
          <a
            href="/dashboard"
            className="inline-block bg-[#FF6700] hover:bg-[#e05c00] text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm"
          >
            Go to dashboard →
          </a>
        </div>

      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EDEDE9] p-6 space-y-4">
      {children}
    </div>
  );
}

function SectionHeading({
  children,
  icon,
  color,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center shrink-0 text-white`}>
        {icon}
      </div>
      <h2 className="font-bold text-[#262626] text-lg">{children}</h2>
    </div>
  );
}
