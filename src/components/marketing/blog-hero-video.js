"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Hero video that paints the poster image first (fast LCP), then starts the
 * compressed MP4 after first paint so the page is not blocked on video bytes.
 */
export default function BlogHeroVideo({ src, poster, alt }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return undefined;

    const markPlaying = () => setPlaying(true);
    el.addEventListener("playing", markPlaying);

    const start = () => {
      el.preload = "auto";
      el.play().catch(() => {});
    };

    let idleId = 0;
    let timeoutId = 0;
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(start, { timeout: 800 });
    } else {
      timeoutId = window.setTimeout(start, 50);
    }

    return () => {
      el.removeEventListener("playing", markPlaying);
      if (idleId && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [src]);

  return (
    <div className="relative order-1 w-full overflow-hidden bg-bg aspect-video min-h-[14rem] sm:min-h-[18rem] lg:order-2 lg:aspect-auto lg:min-h-[22rem] lg:h-full">
      <Image
        src={poster}
        alt={alt}
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 70vw"
        className={`object-cover object-center transition-opacity duration-300 ${playing ? "pointer-events-none opacity-0" : "opacity-100"}`}
      />
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover object-center"
        muted
        playsInline
        loop
        preload="none"
        poster={poster}
        aria-label={alt}
      >
        <source src={src} type="video/mp4" />
      </video>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-10 bg-gradient-to-r from-card/40 to-transparent lg:block"
        aria-hidden
      />
    </div>
  );
}
