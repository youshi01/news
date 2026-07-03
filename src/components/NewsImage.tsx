"use client";

import { useEffect, useMemo, useState } from "react";

type NewsImageProps = {
  src: string;
  title: string;
  category: string;
  seed: string | number;
  loading?: "eager" | "lazy";
};

function placeholderSrc(title: string, category: string, seed: string | number) {
  const params = new URLSearchParams({
    title: title || "Latest News",
    category: category || "news",
    seed: String(seed || title || "news")
  });

  return `/api/placeholder-image?${params.toString()}`;
}

export function NewsImage({
  src,
  title,
  category,
  seed,
  loading = "lazy"
}: NewsImageProps) {
  const fallback = useMemo(
    () => placeholderSrc(title, category, seed),
    [category, seed, title]
  );
  const [currentSrc, setCurrentSrc] = useState(src || fallback);

  useEffect(() => {
    setCurrentSrc(src || fallback);
  }, [fallback, src]);

  return (
    <img
      src={currentSrc}
      alt=""
      loading={loading}
      decoding="async"
      onError={() => {
        if (currentSrc !== fallback) {
          setCurrentSrc(fallback);
        }
      }}
    />
  );
}
