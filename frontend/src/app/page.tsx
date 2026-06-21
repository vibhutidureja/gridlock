"use client";

import { useEffect, useState, useCallback } from "react";
import { getEvents } from "@/lib/api";
import KPICards from "@/components/KPICards";
import TrafficCharts from "@/components/TrafficCharts";
import EventFeed from "@/components/EventFeed";
import SimulationPanel from "@/components/SimulationPanel";
import TrafficMap from "@/components/TrafficMap";
import EventForm from "@/components/EventForm";
import { RefreshCw, AlertCircle, Map, PlusCircle, Cpu } from "lucide-react";

type Tab = "map" | "log" | "simulate";

export default function Home() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("map");
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [newPinLocation, setNewPinLocation] = useState<[number, number] | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchEvents = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const data = await getEvents();
      setEvents(data || []);
      setErrorMsg(null);
      setLastRefresh(new Date());
    } catch (error: any) {
      setErrorMsg(error?.message || "Unknown error occurred.");
    } finally {
      setLoading(false);
      if (showSpinner) setTimeout(() => setIsRefreshing(false), 600);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(() => fetchEvents(), 10000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // Select event handler - also switches to map tab
  const handleSelectEvent = (event: any) => {
    setSelectedEventId(event.id);
    setActiveTab("map");
  };

  if (loading && events.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center flex-col gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#2874F0] border-t-transparent animate-spin" />
        <div className="text-[#717171] text-sm font-medium">Connecting to UrbanFlow AI Engine...</div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-[#FDECEA] flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-[#E53935]" size={28} />
          </div>
          <h2 className="font-bold text-[#212121] text-lg mb-2">Connection Failed</h2>
          <p className="text-[#717171] text-sm mb-4">Could not connect to UrbanFlow backend API.</p>
          <code className="block text-[11px] bg-[#F8F9FB] border border-[#E0E3E8] rounded p-2 text-[#444] font-mono mb-4 break-all">
            {errorMsg}
          </code>
          <button onClick={() => fetchEvents(true)} className="btn-primary w-full">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "map", label: "Live Map", icon: Map },
    { id: "log", label: "Log Event", icon: PlusCircle },
    { id: "simulate", label: "AI Engine", icon: Cpu },
  ];

  return (
    <div className="flex flex-col gap-4 min-h-full pb-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#212121]">Command Center</h1>
          <p className="text-xs text-[#717171] mt-0.5">
            Real-time traffic intelligence · UrbanFlow Nexus AI
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-[#9CA3AF] hidden sm:block">
            Updated {lastRefresh.toLocaleTimeString()}
          </div>
          <button
            onClick={() => fetchEvents(true)}
            title="Refresh data"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E0E3E8] rounded-md bg-white hover:border-[#2874F0] hover:text-[#2874F0] transition-all text-sm font-medium text-[#444]"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-[#2874F0]" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards events={events} />

      {/* Main content area (Map & AI Engine) */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-4 min-h-0 mt-2">
        {/* Left: Map (large, 8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-3 min-h-0">
          {/* Map card */}
          <div className="card flex flex-col overflow-hidden" style={{ minHeight: "650px", flex: 3 }}>
            <div className="section-header shrink-0">
              <Map size={15} className="text-[#2874F0]" />
              <h3 className="font-semibold text-[#212121] text-sm">Live Traffic Map — Bangalore</h3>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#26A541] animate-pulse" />
                <span className="text-[11px] text-[#717171] font-medium">LIVE</span>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <TrafficMap 
                events={events} 
                selectedEventId={selectedEventId} 
                newPinLocation={newPinLocation}
                onMapClick={(lat, lon) => {
                  setNewPinLocation([lat, lon]);
                  setActiveTab("log");
                }}
                onEventSelect={(id) => {
                  const evt = events.find(e => e.id === id);
                  if (evt) handleSelectEvent(evt);
                }}
              />
            </div>
          </div>
        </div>

        {/* Right panel: tabbed (4 cols) */}
        <div className="xl:col-span-4 flex flex-col min-h-0" style={{ minHeight: "650px" }}>
          {/* Tab switcher */}
          <div className="flex border-b border-[#E0E3E8] bg-white rounded-t-lg overflow-hidden shrink-0">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all ${
                  activeTab === id
                    ? "text-[#2874F0] border-b-2 border-[#2874F0] bg-[#EBF2FF]"
                    : "text-[#717171] hover:text-[#2874F0] hover:bg-[#F8F9FB]"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0 bg-white border border-t-0 border-[#E0E3E8] rounded-b-lg overflow-hidden">
            {activeTab === "map" && (
              <div className="h-full flex flex-col overflow-auto custom-scrollbar">
                <div className="p-4 border-b border-[#E0E3E8] bg-[#F8F9FB]">
                  <div className="text-xs font-semibold text-[#444] mb-1">Quick Event Locator</div>
                  <div className="text-[11px] text-[#9CA3AF]">Click an event to highlight it on the map.</div>
                </div>
                <div className="flex-1 p-3 space-y-2 overflow-auto custom-scrollbar">
                  {events.length === 0 ? (
                    <div className="text-center py-8 text-[#9CA3AF] text-sm">No active events.</div>
                  ) : events.map(e => {
                    const isSelected = selectedEventId === e.id;
                    const sev = e.predicted_severity ?? 0;
                    const sevColor = sev >= 7 ? "#E53935" : sev >= 4 ? "#F5A623" : "#26A541";
                    return (
                      <button
                        key={e.id}
                        onClick={() => handleSelectEvent(e)}
                        className={`w-full text-left px-3 py-2.5 rounded-md border transition-all text-xs ${
                          isSelected
                            ? "border-[#2874F0] bg-[#EBF2FF]"
                            : "border-[#E0E3E8] bg-white hover:border-[#2874F0] hover:bg-[#F8F9FB]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#212121]">{e.event_type}</span>
                          <span className="font-bold text-[10px]" style={{ color: sevColor }}>
                            Sev {sev.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#717171]">
                          <span>{e.zone}</span>
                          <span>·</span>
                          <span>{e.predicted_resolution_time_mins ?? "?"} min ETA</span>
                          {e.road_closure && <span className="text-[#E53935] font-semibold">· Closed</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {selectedEventId && (
                  <div className="p-3 border-t border-[#E0E3E8] bg-[#EBF2FF]">
                    <button
                      onClick={() => setSelectedEventId(undefined)}
                      className="text-[11px] text-[#2874F0] font-semibold hover:underline"
                    >
                      ✕ Clear selection
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "log" && (
              <div className="h-full overflow-auto p-2">
                <EventForm 
                  initialLocation={newPinLocation} 
                  onEventCreated={() => {
                    fetchEvents(true);
                    setNewPinLocation(null);
                  }} 
                />
              </div>
            )}

            {activeTab === "simulate" && (
              <div className="h-full overflow-auto">
                <SimulationPanel events={events} onResolve={() => fetchEvents(true)} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Traffic Charts Dashboard - Moved below map */}
      <TrafficCharts events={events} />

      {/* Event Feed - Moved below map */}
      <div className="card flex flex-col overflow-hidden" style={{ minHeight: "350px" }}>
        <EventFeed events={events} onSelectEvent={handleSelectEvent} />
      </div>
    </div>
  );
}
