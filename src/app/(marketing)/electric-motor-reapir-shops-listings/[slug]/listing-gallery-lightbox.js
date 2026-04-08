"use client";

import { useState, useEffect, useCallback } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { ListingGalleryThumb } from "@/components/listings/listing-optimized-images";
import { getListingImageSrc } from "@/lib/listing-image";

export default function ListingGalleryLightbox({ urls, companyName = "" }) {
  const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(list.length - 1, i + 1));
  }, [list.length]);

  useEffect(() => {
    if (!open || list.length === 0) return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, list.length, goPrev, goNext]);

  if (list.length === 0) return null;

  const fullSrc = getListingImageSrc(list[index]);
  const altBase = String(companyName || "Repair center").trim() || "Gallery";
  const multi = list.length > 1;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((url, i) => (
          <button
            key={i}
            type="button"
            className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted/30 text-left transition-opacity hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card"
            onClick={() => {
              setIndex(i);
              setOpen(true);
            }}
            aria-label={`Open gallery image ${i + 1} of ${list.length} in full size`}
          >
            <ListingGalleryThumb src={url} />
          </button>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={multi ? `Photo ${index + 1} of ${list.length}` : "Photo"}
        size="6xl"
        className="max-w-[min(72rem,96vw)]"
        headerClassName="flex-wrap"
        actions={
          multi ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={goPrev}
                disabled={index <= 0}
                aria-label="Previous image"
              >
                <FiChevronLeft className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={goNext}
                disabled={index >= list.length - 1}
                aria-label="Next image"
              >
                <span className="hidden sm:inline">Next</span>
                <FiChevronRight className="h-4 w-4 shrink-0" />
              </Button>
            </>
          ) : null
        }
      >
        <div className="flex min-h-[min(50vh,420px)] items-center justify-center sm:min-h-[55vh]">
          {fullSrc ? (
            <img
              key={fullSrc}
              src={fullSrc}
              alt={`${altBase} — gallery image ${index + 1} of ${list.length}`}
              className="max-h-[min(75vh,880px)] w-auto max-w-full rounded-md object-contain"
              loading="eager"
              decoding="async"
            />
          ) : null}
        </div>
      </Modal>
    </>
  );
}
