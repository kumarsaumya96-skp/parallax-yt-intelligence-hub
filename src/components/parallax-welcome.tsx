"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export function ParallaxWelcome({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);

  const continueToLogin = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    window.setTimeout(() => router.replace(`/login?next=${encodeURIComponent(nextPath)}`), 450);
  }, [nextPath, router]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(continueToLogin, reducedMotion ? 475 : 3100);
    return () => window.clearTimeout(timer);
  }, [continueToLogin]);

  return (
    <main
      className={`parallax-welcome ${leaving ? "parallax-welcome--leaving" : ""}`}
      aria-label="Welcome to Parallax"
    >
      <div className="parallax-welcome__grid" aria-hidden="true" />
      <div className="parallax-welcome__beam parallax-welcome__beam--one" aria-hidden="true" />
      <div className="parallax-welcome__beam parallax-welcome__beam--two" aria-hidden="true" />
      <div className="parallax-welcome__content">
        <div className="parallax-welcome__mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="parallax-welcome__eyebrow">Welcome to Parallax</p>
        <h1>See the signal behind every YouTube story.</h1>
        <div className="parallax-welcome__brand">
          <span>Parallax</span>
          <span aria-hidden="true">/</span>
          <span>YouTube Intelligence Hub</span>
        </div>
      </div>
      <button className="parallax-welcome__continue" onClick={continueToLogin} type="button">
        Continue to sign in <ArrowRight size={17} />
      </button>
      <div className="parallax-welcome__progress" aria-hidden="true">
        <span />
      </div>
    </main>
  );
}
