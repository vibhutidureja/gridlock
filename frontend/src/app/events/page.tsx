"use client";

import { useEffect, useState, useCallback } from "react";
import { getEvents, resolveEvent } from "@/lib/api";
import EventFeed from "@/components/EventFeed";
import { AlertTriangle, RefreshCw, Filter, CheckCircle2, Loader2 } from "lucide-react";

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();

  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolveDesc, setResolveDesc] = useState("");
  const [resolveTime, setResolveTime] = useState(60);
  const [aiAccurate, setAiAccurate] = useState(true);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    setShowResolveForm(false);
    setResolveDesc("");
    setResolveTime(60);
    setAiAccurate(true);
  }, [selectedEventId]);

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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full" style={{
                    background: selectedEvent.status === "Resolved" ? "#E8F5EB" : "#EBF2FF",
                    color: selectedEvent.status === "Resolved" ? "#26A541" : "#2874F0",
                  }}>
                    {selectedEvent.status || "Active"}
                  </span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full" style={{
                    background: selectedEvent.priority === "Critical" ? "#FCE4E4" : selectedEvent.priority === "High" ? "#FDECEA" : selectedEvent.priority === "Medium" ? "#FEF5E7" : "#E8F5EB",
                    color: selectedEvent.priority === "Critical" ? "#B71C1C" : selectedEvent.priority === "High" ? "#D0021B" : selectedEvent.priority === "Medium" ? "#B07800" : "#1B5E20",
                  }}>
                    {selectedEvent.priority} Priority
                  </span>
                </div>
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

              {selectedEvent.status === "Resolved" ? (
                <div className="mb-6 p-4 rounded-md border border-[#B2DFBC] bg-[#E8F5EB]">
                  <div className="text-[10px] font-bold text-[#1B5E20] uppercase tracking-wide mb-2">Resolution Summary</div>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-[10px] text-[#26A541] font-semibold">Actual Time Taken</div>
                      <div className="font-bold text-[#1B5E20]">{selectedEvent.actual_resolution_time_mins} minutes</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#26A541] font-semibold">AI Accuracy</div>
                      <div className="font-bold text-[#1B5E20]">{selectedEvent.ai_accurate ? "Accurate" : "Inaccurate"}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-[#26A541] font-semibold mb-1">Actions Taken</div>
                  <div className="text-sm text-[#1B5E20] leading-relaxed">
                    {selectedEvent.resolution_description || "No description provided."}
                  </div>
                </div>
              ) : (
                <div className="mb-6 pt-4 border-t border-[#E0E3E8]">
                  {!showResolveForm ? (
                    <button
                      onClick={() => setShowResolveForm(true)}
                      className="w-full py-2.5 rounded border-2 border-[#26A541] text-[#26A541] font-bold text-sm hover:bg-[#E8F5EB] transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={16} />
                      Mark Issue as Resolved
                    </button>
                  ) : (
                    <div className="bg-[#F8F9FB] border border-[#E0E3E8] rounded-lg p-4 space-y-3">
                      <div className="font-bold text-sm text-[#212121]">Resolution Details</div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#717171] mb-1">How was the issue resolved?</label>
                        <textarea 
                          value={resolveDesc}
                          onChange={e => setResolveDesc(e.target.value)}
                          className="form-input text-sm min-h-[60px]" 
                          placeholder="E.g. Diverted traffic via 1st Main and cleared the blockage."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#717171] mb-1">Time taken (mins)</label>
                          <input 
                            type="number" 
                            value={resolveTime}
                            onChange={e => setResolveTime(parseInt(e.target.value) || 0)}
                            className="form-input text-sm" 
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#717171] mb-1">Was AI Advice Accurate?</label>
                          <select 
                            value={aiAccurate ? "Yes" : "No"}
                            onChange={e => setAiAccurate(e.target.value === "Yes")}
                            className="form-input text-sm"
                          >
                            <option>Yes</option>
                            <option>No</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <button 
                          className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-2"
                          disabled={resolving}
                          onClick={async () => {
                            setResolving(true);
                            try {
                              await resolveEvent(selectedEventId!, {
                                resolution_description: resolveDesc || "Resolved manually.",
                                actual_resolution_time_mins: resolveTime,
                                ai_accurate: aiAccurate
                              });
                              await fetchEvents();
                              setShowResolveForm(false);
                            } catch (e) {
                              console.error("Failed to resolve", e);
                            } finally {
                              setResolving(false);
                            }
                          }}
                        >
                          {resolving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          Confirm Resolution
                        </button>
                        <button 
                          onClick={() => setShowResolveForm(false)}
                          className="px-4 py-2 border border-[#E0E3E8] rounded bg-white text-[#717171] text-sm font-semibold hover:bg-[#F1F3F6]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedEvent.location && (
                <div className="ai-box mb-4">
                  <div className="text-[10px] font-bold text-[#2874F0] uppercase tracking-wide mb-1">GPS Coordinates</div>
                  {(() => {
                    const match = selectedEvent.location.match(/POINT\(([\d.\-]+)\s+([\d.\-]+)\)/);
                    if (match) {
                      const lon = parseFloat(match[1]).toFixed(6);
                      const lat = parseFloat(match[2]).toFixed(6);
                      return (
                        <div className="flex gap-4">
                          <div><span className="text-[10px] text-[#9CA3AF]">Latitude</span><div className="font-mono text-sm font-semibold text-[#212121]">{lat}°N</div></div>
                          <div><span className="text-[10px] text-[#9CA3AF]">Longitude</span><div className="font-mono text-sm font-semibold text-[#212121]">{lon}°E</div></div>
                        </div>
                      );
                    }
                    return <div className="font-mono text-sm text-[#444]">{selectedEvent.location}</div>;
                  })()}
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
