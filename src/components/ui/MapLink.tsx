"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "sr_last_map";

/** Remembers the map the visitor last opened (path + query only, never a position). */
export function rememberMapUrl(url: string) {
  try {
    if (url.startsWith("/mapa/")) localStorage.setItem(KEY, url);
  } catch {
    // storage unavailable: the link falls back to the start screen
  }
}

/** "Mapa" in page headers: back to the last map, or the city chooser when there is none. */
export function MapLink({ className, children, ...rest }: { className?: string; children: React.ReactNode; "aria-label"?: string }) {
  const [href, setHref] = useState("/");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && /^\/mapa\/[\w-]+(\?[\w=&%-]*)?$/.test(saved)) setHref(saved);
    } catch {
      // keep "/"
    }
  }, []);
  return (
    <Link href={href} className={className} {...rest}>
      {children}
    </Link>
  );
}
