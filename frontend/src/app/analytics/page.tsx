"use client";

import { useEffect, useState, useCallback } from "react";
import { getEvents } from "@/lib/api";
import { BarChart2, TrendingUp, Activity, Map } from "lucide-react";

export default function AnalyticsPage() {
  const [events, setEvents] = useState<any[]>([]);

  const fetchEvents = useCallback(async () => {
    try { const data = await getEvents(); setEvents(data || []); } catch {}
  }, []);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const zoneBreakdown = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.zone] = (acc[e.zone] || 0) + 1;
    return acc;
  }, {});

  const typeBreakdown = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] || 0) + 1;
    return acc;
  }, {});

  const avgSev = events.length > 0
    ? (events.reduce((s, e) => s + (e.predicted_severity || 0), 0) / events.length).toFixed(1)
    : "0.0";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-[#212121]">Analytics</h1>
        <p className="text-xs text-[#717171] mt-0.5">Traffic incident breakdown and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Zone breakdown */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Map size={15} className="text-[#2874F0]" />
            <h2 className="font-semibold text-[#212121] text-sm">Incidents by Zone</h2>
          </div>
          {Object.keys(zoneBreakdown).length === 0 ? (
            <div className="text-center py-6 text-[#9CA3AF] text-sm">No data yet</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(zoneBreakdown).sort((a, b) => b[1] - a[1]).map(([zone, count]) => (
                <div key={zone} className="flex items-center gap-3">
                  <span className="text-xs text-[#717171] w-28 shrink-0 truncate">{zone}</span>
                  <div className="flex-1 h-5 bg-[#F1F3F6] rounded overflow-hidden">
                    <div
                      className="h-full bg-[#2874F0] rounded transition-all duration-500 flex items-center px-2"
                      style={{ width: `${(count / events.length) * 100}%` }}
                    >
                      <span className="text-[10px] text-white font-bold">{count}</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#444] w-8 text-right">{Math.round((count / events.length) * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Type breakdown */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={15} className="text-[#F5A623]" />
            <h2 className="font-semibold text-[#212121] text-sm">Incidents by Type</h2>
          </div>
          {Object.keys(typeBreakdown).length === 0 ? (
            <div className="text-center py-6 text-[#9CA3AF] text-sm">No data yet</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(typeBreakdown).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-xs text-[#717171] w-28 shrink-0 truncate">{type}</span>
                  <div className="flex-1 h-5 bg-[#F1F3F6] rounded overflow-hidden">
                    <div
                      className="h-full bg-[#F5A623] rounded transition-all duration-500 flex items-center px-2"
                      style={{ width: `${(count / events.length) * 100}%` }}
                    >
                      <span className="text-[10px] text-white font-bold">{count}</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#444] w-8 text-right">{Math.round((count / events.length) * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary stats */}
        <div className="card p-5 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={15} className="text-[#26A541]" />
            <h2 className="font-semibold text-[#212121] text-sm">Summary Statistics</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Events", value: events.length.toString(), color: "#2874F0" },
              { label: "Avg Severity", value: `${avgSev}/10`, color: "#F5A623" },
              { label: "Road Closures", value: events.filter(e => e.road_closure).length.toString(), color: "#E53935" },
              { label: "High Priority", value: events.filter(e => e.priority === "High" || e.priority === "Critical").length.toString(), color: "#26A541" },
            ].map(({ label, value, color }) => (
              <div key={label} className="ai-box text-center">
                <div className="text-2xl font-bold" style={{ color }}>{value}</div>
                <div className="text-xs text-[#717171] mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
