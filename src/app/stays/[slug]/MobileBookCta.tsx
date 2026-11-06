"use client";

import { useEffect, useState } from "react";

// Plutajuće dugme na mobitelu vodi do kalendara; nestaje kad je kalendar već na ekranu.
export default function MobileBookCta() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const target = document.getElementById("booking");
    if (!target) return;
    const io = new IntersectionObserver(([e]) => setVisible(!e.isIntersecting), { threshold: 0.05 });
    io.observe(target);
    return () => io.disconnect();
  }, []);

  if (!visible) return null;
  return (
    <a href="#booking" className="fixed inset-x-4 bottom-4 z-40 rounded-2xl bg-[#0C4A47] py-4 text-center font-bold text-white shadow-lg lg:hidden">
      Check dates &amp; book
    </a>
  );
}
