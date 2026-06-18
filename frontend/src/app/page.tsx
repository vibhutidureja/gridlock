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

  const fetchEvents = useCallback(async () => {
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (error) {
      console.error("Failed to fetch events", error);
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

  if (loading && events.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
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
