"use client";

import { useEffect, useState, useCallback } from "react";
import { getEvents } from "@/lib/api";
import KPICards from "@/components/KPICards";
import EventFeed from "@/components/EventFeed";
import SimulationPanel from "@/components/SimulationPanel";
import TrafficMap from "@/components/TrafficMap";
import EventForm from "@/components/EventForm";

export default function Home() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      console.log("Fetching events...");
      const data = await getEvents();
      console.log("Events fetched:", data);
      setEvents(data || []);
      setErrorMsg(null);
    } catch (error: any) {
      console.error("Failed to fetch events", error);
      setErrorMsg(error?.message || "Unknown error occurred while fetching events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    
    // Poll every 10 seconds for real-time updates
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  if (errorMsg) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center">
        <div className="text-red-500 font-bold mb-2">Error connecting to backend</div>
        <div className="text-gray-400 font-mono text-sm max-w-lg text-center">{errorMsg}</div>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 rounded text-white text-sm">Retry</button>
      </div>
    );
  }

  if (loading && events.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
        <div className="text-gray-500 text-sm">Connecting to UrbanFlow AI Engine...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Command Center</h1>
        <p className="text-gray-400 text-sm">Real-time traffic intelligence and predictive interventions.</p>
      </div>

      <KPICards events={events} />

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-6 min-h-[500px]">
        {/* Left Column - Map & Feed (Takes up 2 cols) */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="flex-1 min-h-[400px]">
            <TrafficMap events={events} />
          </div>
          <div className="h-[300px]">
            <EventFeed events={events} />
          </div>
        </div>

        {/* Right Columns - Forms & Controls */}
        <div className="xl:col-span-1 h-full">
          <EventForm onEventCreated={fetchEvents} />
        </div>
        <div className="xl:col-span-1 h-full">
          <SimulationPanel events={events} />
        </div>
      </div>
    </div>
  );
}
