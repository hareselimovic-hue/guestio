export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left — form */}
      <div className="w-full lg:w-1/2 flex flex-col bg-[#F4F4F1] lg:bg-white">
        <div className="px-8 pt-10 flex flex-col items-center lg:items-start">
          <div className="inline-block bg-[#0F2F61] text-white px-4 py-2 rounded-lg font-bold text-xl tracking-tight">
            SmartStay
          </div>
          <p className="text-[#6B6B6B] text-xs mt-1.5 lg:hidden">Guest guides made simple</p>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm bg-white lg:bg-transparent rounded-2xl shadow-sm lg:shadow-none p-7 lg:p-0">
            {children}
          </div>
        </div>
      </div>

      {/* Right — image */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-end pb-16"
        style={{
          backgroundImage:
            "url('/auth-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Quote */}
        <div className="relative z-10 text-center px-12">
          <p className="text-white text-2xl font-semibold leading-snug mb-3">
            &ldquo;Everything your guest needs —<br />in one link.&rdquo;
          </p>
          <p className="text-white/60 text-sm tracking-widest uppercase">SmartStay</p>
        </div>
      </div>
    </div>
  );
}
