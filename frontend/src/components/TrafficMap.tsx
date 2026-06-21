"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const TrafficMapInner = dynamic(() => import("./TrafficMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#F8F9FB] rounded-lg border border-[#E0E3E8] animate-pulse gap-3">
      <div className="w-10 h-10 rounded-full border-4 border-[#2874F0] border-t-transparent animate-spin" />
      <span className="text-[#717171] text-sm font-medium">Loading Traffic Map...</span>
    </div>
  ),
});

export default function TrafficMap({ events, selectedEventId, onMapClick, newPinLocation, onEventSelect }: { events: any[]; selectedEventId?: string; onMapClick?: (lat: number, lon: number) => void; newPinLocation?: [number, number] | null; onEventSelect?: (id: string) => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <TrafficMapInner events={events} selectedEventId={selectedEventId} onMapClick={onMapClick} newPinLocation={newPinLocation} onEventSelect={onEventSelect} />;
}
