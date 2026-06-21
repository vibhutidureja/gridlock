"use client";

import { useEffect, useState, useCallback } from "react";
import { getEvents } from "@/lib/api";
import TrafficMap from "@/components/TrafficMap";
import EventFeed from "@/components/EventFeed";
import { Map, RefreshCw } from "lucide-react";

export default function MapPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();

  const fetchEvents = useCallback(async () => {
    try {
      const data = await getEvents();
      setEvents(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#212121]">Live Traffic Map</h1>
          <p className="text-xs text-[#717171] mt-0.5">Real-time traffic events across Bangalore</p>
        </div>
        <button onClick={() => fetchEvents()} className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E0E3E8] rounded-md bg-white hover:border-[#2874F0] hover:text-[#2874F0] transition-all text-sm font-medium text-[#444]">
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-4 min-h-0">
        {/* Full-size map */}
        <div className="xl:col-span-3 card overflow-hidden" style={{ minHeight: "500px" }}>
          <div className="section-header">
            <Map size={15} className="text-[#2874F0]" />
            <h3 className="font-semibold text-[#212121] text-sm">Bangalore — Live View</h3>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#26A541] animate-pulse" />
              <span className="text-[11px] text-[#717171] font-medium">LIVE</span>
            </div>
          </div>
          <div style={{ height: "calc(100% - 44px)" }}>
            {loading ? (
              <div className="w-full h-full flex items-center justify-center bg-[#F8F9FB]">
                <div className="w-8 h-8 border-4 border-[#2874F0] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <TrafficMap events={events} selectedEventId={selectedEventId} onEventSelect={(id) => setSelectedEventId(id)} />
            )}
          </div>
        </div>

        {/* Event list */}
        <div className="xl:col-span-1 min-h-0" style={{ minHeight: "500px" }}>
          <EventFeed events={events} onSelectEvent={(e) => setSelectedEventId(e.id)} />
        </div>
      </div>
    </div>
  );
}
