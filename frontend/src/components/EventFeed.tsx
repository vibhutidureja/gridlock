import { MapPin, Clock, AlertTriangle, CheckCircle, Radio, ChevronRight, Filter } from "lucide-react";
import { useState } from "react";

function priorityConfig(priority: string) {
  switch (priority?.toLowerCase()) {
    case "critical": return { bg: "#FCE4E4", text: "#B71C1C", border: "#F5B8B8", dot: "#B71C1C", label: "Critical" };
    case "high": return { bg: "#FDECEA", text: "#D0021B", border: "#FBCDD0", dot: "#E53935", label: "High" };
    case "medium": return { bg: "#FEF5E7", text: "#B07800", border: "#FDEDB2", dot: "#F5A623", label: "Medium" };
    default: return { bg: "#E8F5EB", text: "#1B5E20", border: "#B2DFBC", dot: "#26A541", label: "Low" };
  }
}

export default function EventFeed({ events, onSelectEvent }: { events: any[]; onSelectEvent?: (e: any) => void }) {
  const [filter, setFilter] = useState<string>("All");
  const filters = ["All", "New", "Observing", "Resolved", "Critical"];

  const filtered = events.filter(e => {
    if (filter === "All") return e.status !== "Resolved";
    if (filter === "Critical") return e.priority === "Critical" && e.status !== "Resolved";
    return (e.status || "New") === filter;
  });

  if (events.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center h-full text-center py-10">
        <div className="w-14 h-14 rounded-full bg-[#E8F5EB] flex items-center justify-center mb-3">
          <CheckCircle className="text-[#26A541]" size={28} />
        </div>
        <h3 className="font-semibold text-[#212121]">Network Clear</h3>
        <p className="text-[#717171] text-sm mt-1">No active traffic events recorded.</p>
      </div>
    );
  }

  return (
    <div className="card flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="section-header justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Radio size={16} className="text-[#E53935]" />
          <h3 className="font-semibold text-[#212121] text-sm">Live Event Feed</h3>
          <span className="text-[10px] bg-[#2874F0] text-white px-2 py-0.5 rounded-full font-semibold ml-1">
            {events.filter(e => e.status !== "Resolved").length} Active
          </span>
        </div>
        <Filter size={15} className="text-[#717171]" />
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 px-3 py-2 border-b border-[#E0E3E8] overflow-x-auto shrink-0">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
              filter === f
                ? "bg-[#2874F0] text-white border-[#2874F0]"
                : "bg-white text-[#717171] border-[#E0E3E8] hover:border-[#2874F0] hover:text-[#2874F0]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-auto custom-scrollbar p-2 space-y-1.5">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-sm text-[#9CA3AF]">No events matching filter</div>
        ) : filtered.map((event) => {
          const p = priorityConfig(event.priority);
          const isCritical = event.priority === "Critical";
          return (
            <div
              key={event.id}
              onClick={() => onSelectEvent?.(event)}
              className="p-3 rounded-md cursor-pointer transition-all duration-150 hover:shadow-sm border group"
              style={{
                backgroundColor: filter === "All" ? "white" : p.bg + "40",
                borderColor: "#E0E3E8",
                borderLeft: `4px solid ${p.dot}`,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isCritical ? (
                    <AlertTriangle size={15} className="text-[#B71C1C] shrink-0" />
                  ) : (
                    <div className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: p.dot }} />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-[#212121] truncate">{event.event_type}</div>
                    <div className="text-[11px] text-[#717171] truncate">{event.zone} Zone</div>
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style={{ background: p.bg, color: p.text, borderColor: p.border }}
                  >
                    {p.label}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    event.status === "Resolved" ? "bg-[#E8F5EB] text-[#26A541] border-[#B2DFBC]" :
                    event.status === "Observing" ? "bg-[#FFF8E6] text-[#F5A623] border-[#FDEDB2]" :
                    "bg-[#EBF2FF] text-[#2874F0] border-[#2874F0]/30"
                  }`}>
                    {event.status || "New"}
                  </span>
                  <span className="text-[10px] font-semibold text-[#717171]">
                    Sev {event.predicted_severity?.toFixed(1)}/10
                  </span>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-4">
                <div className="flex items-center gap-1 text-[11px] text-[#717171]">
                  <Clock size={11} />
                  <span>ETA: {event.predicted_resolution_time_mins} min</span>
                </div>
                {event.road_closure && (
                  <span className="text-[10px] bg-[#FDECEA] text-[#E53935] px-1.5 py-0.5 rounded font-semibold border border-[#FBCDD0]">
                    Road Closed
                  </span>
                )}
              </div>

              <div className="mt-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] text-[#9CA3AF]">
                  <MapPin size={10} />
                  <span className="font-mono">
                    {(() => {
                      const loc = event.location;
                      if (!loc) return "N/A";
                      const match = loc.match(/POINT\(([\d.\-]+)\s+([\d.\-]+)\)/);
                      if (match) {
                        const lon = parseFloat(match[1]).toFixed(4);
                        const lat = parseFloat(match[2]).toFixed(4);
                        return `${lat}°N, ${lon}°E`;
                      }
                      return loc;
                    })()}
                  </span>
                </div>
                <ChevronRight size={13} className="text-[#C2C8D4] group-hover:text-[#2874F0] transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
