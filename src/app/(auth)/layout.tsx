export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left — form */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white">
        <div className="px-8 pt-8">
          <div className="inline-block bg-[#0F2F61] text-white px-4 py-2 rounded-lg font-bold text-xl tracking-tight">
            SmartStay
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      {/* Right — image */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-end pb-16"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Quote */}
        <div className="relative z-10 text-center px-12">
          <p className="text-white text-2xl font-semibold leading-snug mb-3">
            &ldquo;Sve što gostu treba —<br />na jednom linku.&rdquo;
          </p>
          <p className="text-white/60 text-sm tracking-widest uppercase">SmartStay</p>
        </div>
      </div>
    </div>
  );
}
