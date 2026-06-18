"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Dynamically import the map component with SSR disabled since Leaflet relies on window
const TrafficMapInner = dynamic(() => import("./TrafficMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black/20 rounded-xl border border-[var(--color-card-border)] animate-pulse">
      <span className="text-gray-400">Loading Map...</span>
    </div>
  ),
});

export default function TrafficMap({ events }: { events: any[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <TrafficMapInner events={events} />;
}
