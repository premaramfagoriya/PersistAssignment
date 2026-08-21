"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AutoRedirect({ to, delayMs = 3000 }: { to: string; delayMs?: number }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(Math.ceil(delayMs / 1000));

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    const redirect = setTimeout(() => {
      router.push(to);
    }, delayMs);

    return () => {
      clearInterval(timer);
      clearTimeout(redirect);
    };
  }, [to, delayMs, router]);

  return (
    <div className="mt-6 text-sm text-center" style={{ color: "var(--text-dim)" }}>
      Opening conversation automatically in {seconds}...
    </div>
  );
}
