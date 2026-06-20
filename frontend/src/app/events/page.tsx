"use client";

import { useEffect, useState, useCallback } from "react";
import { getEvents } from "@/lib/api";
import EventFeed from "@/components/EventFeed";
import { AlertTriangle, RefreshCw, Filter } from "lucide-react";

export default function EventsPage() {
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

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#212121]">Active Events</h1>
          <p className="text-xs text-[#717171] mt-0.5">{events.length} incident{events.length !== 1 ? "s" : ""} currently active across all zones</p>
        </div>
        <button onClick={fetchEvents} className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E0E3E8] rounded-md bg-white hover:border-[#2874F0] hover:text-[#2874F0] transition-all text-sm font-medium text-[#444]">
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-4 min-h-0">
        {/* Event feed */}
        <div className="xl:col-span-1" style={{ minHeight: "400px" }}>
          <EventFeed events={events} onSelectEvent={(e) => setSelectedEventId(e.id)} />
        </div>

        {/* Event detail panel */}
        <div className="xl:col-span-2 card overflow-auto custom-scrollbar">
          {selectedEvent ? (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-[#212121] text-lg">{selectedEvent.event_type}</h2>
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{
                  background: selectedEvent.priority === "Critical" ? "#FCE4E4" : selectedEvent.priority === "High" ? "#FDECEA" : selectedEvent.priority === "Medium" ? "#FEF5E7" : "#E8F5EB",
                  color: selectedEvent.priority === "Critical" ? "#B71C1C" : selectedEvent.priority === "High" ? "#D0021B" : selectedEvent.priority === "Medium" ? "#B07800" : "#1B5E20",
                }}>
                  {selectedEvent.priority} Priority
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { label: "Zone", value: selectedEvent.zone },
                  { label: "Severity", value: `${selectedEvent.predicted_severity?.toFixed(1) ?? "N/A"} / 10` },
                  { label: "Est. Resolution", value: `${selectedEvent.predicted_resolution_time_mins ?? "N/A"} minutes` },
                  { label: "Road Closure", value: selectedEvent.road_closure ? "Yes — Diversion Active" : "No" },
                ].map(({ label, value }) => (
                  <div key={label} className="ai-box">
                    <div className="text-[10px] font-bold text-[#2874F0] uppercase tracking-wide mb-1">{label}</div>
                    <div className="font-semibold text-sm text-[#212121]">{value}</div>
                  </div>
                ))}
              </div>

              {selectedEvent.location && (
                <div className="ai-box mb-4">
                  <div className="text-[10px] font-bold text-[#2874F0] uppercase tracking-wide mb-1">Location Coordinates</div>
                  <div className="font-mono text-sm text-[#444]">{selectedEvent.location.replace("POINT(", "").replace(")", "")}</div>
                </div>
              )}

              {/* Severity bar */}
              <div>
                <div className="flex justify-between text-xs text-[#717171] mb-1">
                  <span>Severity Gauge</span>
                  <span className="font-semibold">{selectedEvent.predicted_severity?.toFixed(1) ?? 0}/10</span>
                </div>
                <div className="h-3 bg-[#F1F3F6] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${((selectedEvent.predicted_severity ?? 0) / 10) * 100}%`,
                      background: (selectedEvent.predicted_severity ?? 0) >= 7 ? "#E53935" : (selectedEvent.predicted_severity ?? 0) >= 4 ? "#F5A623" : "#26A541",
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-3">
              <AlertTriangle size={40} className="text-[#C2C8D4]" />
              <div>
                <h3 className="font-semibold text-[#444] text-sm">Select an Event</h3>
                <p className="text-xs text-[#9CA3AF] mt-1">Click any event in the feed to view full details.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
