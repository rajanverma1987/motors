"use client";

import { useEffect, useRef, useState } from "react";

export default function WatchDemoPlayer({ token, bookingUrl }) {
  const [showBook, setShowBook] = useState(false);
  const sent = useRef({ play: false, half: false, complete: false, book: false });

  function post(type, percent) {
    fetch(`/api/demo-video/${encodeURIComponent(token)}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, percent }),
    }).catch(() => {});
  }

  useEffect(() => {
    post("page");
    // Record the page open once when this private link loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <main className="min-h-screen bg-bg px-4 py-10 text-title">
      <div className="mx-auto w-full max-w-4xl">
        <p className="text-sm font-medium text-primary">3PhaseFlow</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Watch the demo</h1>
        <p className="mt-2 text-secondary">
          This link is only for your shop. When the video ends, you can book a time to see the software.
        </p>
        <video
          className="mt-6 w-full rounded-lg bg-black"
          controls
          playsInline
          preload="metadata"
          src={`/api/demo-video/${encodeURIComponent(token)}`}
          onPlay={() => {
            if (sent.current.play) return;
            sent.current.play = true;
            post("play", 1);
          }}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            if (!video.duration || sent.current.half) return;
            const percent = (video.currentTime / video.duration) * 100;
            if (percent >= 50) {
              sent.current.half = true;
              post("progress", 50);
            }
          }}
          onEnded={() => {
            setShowBook(true);
            if (sent.current.complete) return;
            sent.current.complete = true;
            post("complete", 100);
          }}
        />
        {showBook ? (
          <div className="mt-6 rounded-lg border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Book a demo</h2>
            <p className="mt-1 text-sm text-secondary">
              We will walk you through the software, screen by screen, so you can see how it fits your shop.
            </p>
            <a
              href={bookingUrl}
              className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
              onClick={() => {
                if (sent.current.book) return;
                sent.current.book = true;
                post("book");
              }}
            >
              Book a demo
            </a>
          </div>
        ) : null}
      </div>
    </main>
  );
}
