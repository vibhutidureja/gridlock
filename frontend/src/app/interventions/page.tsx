"use client";

import { useEffect, useState, useCallback } from "react";
import { getEvents } from "@/lib/api";
import { History, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

export default function InterventionsPage() {
  const [events, setEvents] = useState<any[]>([]);

  const fetchEvents = useCallback(async () => {
    try { const data = await getEvents(); setEvents(data || []); } catch {}
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h1 className="text-xl font-bold text-[#212121]">Intervention History</h1>
        <p className="text-xs text-[#717171] mt-0.5">Past interventions and their effectiveness scores</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <History size={16} className="text-[#2874F0]" />
          <h2 className="font-semibold text-[#212121] text-sm">Recent Interventions</h2>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-12 text-[#9CA3AF] text-sm">No interventions recorded yet. Run a simulation from the AI Engine page to generate entries.</div>
        ) : (
          <div className="space-y-3">
            {events.map((e, i) => (
              <div key={e.id} className="flex items-center gap-4 p-3 rounded-md border border-[#E0E3E8] hover:border-[#2874F0] transition-all">
                <div className="w-8 h-8 rounded-full bg-[#EBF2FF] flex items-center justify-center shrink-0">
                  <span className="text-[#2874F0] font-bold text-xs">#{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-[#212121]">{e.event_type} — {e.zone}</div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] text-[#717171] flex items-center gap-1">
                      <AlertTriangle size={10} /> Sev: {e.predicted_severity?.toFixed(1) ?? "N/A"}
                    </span>
                    <span className="text-[11px] text-[#717171] flex items-center gap-1">
                      <Clock size={10} /> {e.predicted_resolution_time_mins ?? "?"} min
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{
                  background: e.priority === "High" || e.priority === "Critical" ? "#FDECEA" : "#E8F5EB",
                  color: e.priority === "High" || e.priority === "Critical" ? "#D0021B" : "#26A541",
                }}>
                  {e.priority}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
