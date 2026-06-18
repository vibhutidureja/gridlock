"use client";

import { useState } from "react";
import { createEvent } from "@/lib/api";
import { PlusCircle, Loader2 } from "lucide-react";

export default function EventForm({ onEventCreated }: { onEventCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    event_type: "Accident",
    priority: "High",
    zone: "Central",
    road_closure: false,
    location: "POINT(77.5946 12.9716)"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createEvent(formData);
      onEventCreated(); // Refresh the list
      // Reset form
      setFormData({
        ...formData,
        road_closure: false
      });
    } catch (error) {
      console.error("Failed to create event", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-xl flex flex-col overflow-hidden h-full">
      <div className="p-4 border-b border-[var(--color-card-border)] flex items-center gap-2">
        <PlusCircle className="text-green-400" size={20} />
        <h3 className="text-white font-medium">Log New Event</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 flex-1 flex flex-col space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Event Type</label>
          <select 
            value={formData.event_type}
            onChange={(e) => setFormData({...formData, event_type: e.target.value})}
            className="w-full bg-black/30 border border-[var(--color-card-border)] rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
          >
            <option>Accident</option>
            <option>Breakdown</option>
            <option>Protest</option>
            <option>VIP Movement</option>
            <option>Waterlogging</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Zone</label>
            <select 
              value={formData.zone}
              onChange={(e) => setFormData({...formData, zone: e.target.value})}
              className="w-full bg-black/30 border border-[var(--color-card-border)] rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option>Central</option>
              <option>Koramangala</option>
              <option>Indiranagar</option>
              <option>Whitefield</option>
              <option>Electronic City</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Priority</label>
            <select 
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value})}
              className="w-full bg-black/30 border border-[var(--color-card-border)] rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={formData.road_closure}
            onChange={(e) => setFormData({...formData, road_closure: e.target.checked})}
            className="rounded border-gray-600 bg-black/30 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <span className="text-sm text-gray-300">Requires Road Closure</span>
        </label>

        <button 
          type="submit"
          disabled={loading}
          className="w-full mt-auto py-2.5 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <PlusCircle size={16} />
              Submit Event
            </>
          )}
        </button>
      </form>
    </div>
  );
}
