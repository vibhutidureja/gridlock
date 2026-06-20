"use client";

import { useState, useEffect } from "react";
import { createEvent } from "@/lib/api";
import { PlusCircle, Loader2, MapPin, AlertTriangle } from "lucide-react";

const EVENT_TYPES = ["Accident", "Breakdown", "Protest", "VIP Movement", "Waterlogging", "Road Work", "Fire Incident"];
const ZONES = ["Central", "Koramangala", "Indiranagar", "Whitefield", "Electronic City", "Hebbal", "JP Nagar", "Jayanagar", "MG Road", "Marathahalli"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

// Zone coordinate presets (Bangalore)
const ZONE_COORDS: Record<string, [number, number]> = {
  Central: [12.9716, 77.5946],
  Koramangala: [12.9352, 77.6245],
  Indiranagar: [12.9784, 77.6408],
  Whitefield: [12.9698, 77.7499],
  "Electronic City": [12.8399, 77.6770],
  Hebbal: [13.0358, 77.5970],
  "JP Nagar": [12.9102, 77.5837],
  Jayanagar: [12.9308, 77.5830],
  "MG Road": [12.9756, 77.6099],
  Marathahalli: [12.9591, 77.7003],
};

const POLICE_STATIONS: Record<string, string> = {
  Central: "Cubbon Park Police Station",
  Koramangala: "Koramangala Police Station",
  Indiranagar: "Indiranagar Police Station",
  Whitefield: "Whitefield Police Station",
  "Electronic City": "Electronic City Police Station",
  Hebbal: "Hebbal Police Station",
  "JP Nagar": "JP Nagar Police Station",
  Jayanagar: "Jayanagar Police Station",
  "MG Road": "Ashok Nagar Police Station",
  Marathahalli: "Marathahalli Police Station",
};

export default function EventForm({ onEventCreated, initialLocation }: { onEventCreated: () => void; initialLocation?: [number, number] | null }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    event_type: "Accident",
    priority: "High",
    zone: "Central",
    road_closure: false,
    location: initialLocation ? `POINT(${initialLocation[1].toFixed(4)} ${initialLocation[0].toFixed(4)})` : "POINT(77.5946 12.9716)",
  });

  useEffect(() => {
    if (initialLocation) {
      // Find closest zone based on Euclidean distance
      let closestZone = "Central";
      let minDistance = Infinity;
      Object.entries(ZONE_COORDS).forEach(([zone, coords]) => {
        const dist = Math.sqrt(Math.pow(coords[0] - initialLocation[0], 2) + Math.pow(coords[1] - initialLocation[1], 2));
        if (dist < minDistance) {
          minDistance = dist;
          closestZone = zone;
        }
      });

      setFormData(prev => ({
        ...prev,
        zone: closestZone,
        location: `POINT(${initialLocation[1].toFixed(4)} ${initialLocation[0].toFixed(4)})`
      }));
    }
  }, [initialLocation]);

  const handleZoneChange = (zone: string) => {
    const coords = ZONE_COORDS[zone] || [12.9716, 77.5946];
    // Add slight random offset so events in same zone don't stack
    const latOff = (Math.random() - 0.5) * 0.015;
    const lonOff = (Math.random() - 0.5) * 0.015;
    setFormData({
      ...formData,
      zone,
      location: `POINT(${(coords[1] + lonOff).toFixed(4)} ${(coords[0] + latOff).toFixed(4)})`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createEvent(formData);
      setSuccess(true);
      onEventCreated();
      setTimeout(() => setSuccess(false), 2500);
      setFormData({ ...formData, road_closure: false });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to submit event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const priorityColor: Record<string, string> = {
    Low: "text-[#26A541]",
    Medium: "text-[#F5A623]",
    High: "text-[#E53935]",
    Critical: "text-[#B71C1C]",
  };

  return (
    <div className="card flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="section-header shrink-0">
        <PlusCircle size={16} className="text-[#26A541]" />
        <h3 className="font-semibold text-[#212121] text-sm">Log New Event</h3>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-auto custom-scrollbar">
        <div className="p-4 space-y-4 flex-1">
          {/* Event Type */}
          <div>
            <label className="block text-xs font-600 text-[#717171] mb-1.5">Event Type *</label>
            <select
              value={formData.event_type}
              onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
              className="form-input"
            >
              {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          {/* Zone + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-600 text-[#717171] mb-1.5">Zone *</label>
              <select
                value={formData.zone}
                onChange={(e) => handleZoneChange(e.target.value)}
                className="form-input"
              >
                {ZONES.map(z => <option key={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-600 text-[#717171] mb-1.5">
                Priority *
                {formData.priority && (
                  <span className={`ml-1.5 font-bold ${priorityColor[formData.priority]}`}>
                    ● {formData.priority}
                  </span>
                )}
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="form-input"
              >
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Location preview & Police Station */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-600 text-[#717171] mb-1.5">Map Coordinates</label>
              <div className="flex items-center gap-2 bg-[#F8F9FB] border border-[#E0E3E8] rounded px-3 py-2">
                <MapPin size={13} className="text-[#2874F0] shrink-0" />
                <span className="text-xs font-mono text-[#444] truncate">
                  {formData.location.replace("POINT(", "").replace(")", "")}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-600 text-[#717171] mb-1.5">Nearest Police Station</label>
              <div className="flex items-center gap-2 bg-[#E8F5EB] border border-[#B2DFBC] rounded px-3 py-2">
                <span className="text-[11px] font-bold text-[#1B5E20] truncate">
                  {POLICE_STATIONS[formData.zone]}
                </span>
              </div>
            </div>
          </div>

          {/* Road closure */}
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-md border border-[#E0E3E8] hover:border-[#2874F0] hover:bg-[#EBF2FF]/30 transition-all">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={formData.road_closure}
                onChange={(e) => setFormData({ ...formData, road_closure: e.target.checked })}
                className="sr-only"
                id="road-closure-check"
              />
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                formData.road_closure ? "bg-[#2874F0] border-[#2874F0]" : "border-[#C2C8D4] bg-white"
              }`}>
                {formData.road_closure && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-[#212121]">Requires Road Closure</div>
              <div className="text-[11px] text-[#717171] mt-0.5">Traffic diversion will be recommended</div>
            </div>
          </label>

          {/* Priority warning */}
          {(formData.priority === "Critical") && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-[#FCE4E4] border border-[#F5B8B8]">
              <AlertTriangle size={14} className="text-[#B71C1C] shrink-0 mt-0.5" />
              <div className="text-xs text-[#B71C1C] font-medium">
                Critical priority will trigger immediate AI analysis and emergency resource allocation.
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-md bg-[#FDECEA] border border-[#FBCDD0] text-xs text-[#D0021B] font-medium">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="p-3 rounded-md bg-[#E8F5EB] border border-[#B2DFBC] text-xs text-[#26A541] font-semibold">
              ✓ Event logged successfully! Map and feed will update shortly.
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="p-4 border-t border-[#E0E3E8] shrink-0">
          <button
            type="submit"
            disabled={loading}
            id="submit-event-btn"
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Submitting to AI Engine...</span>
              </>
            ) : (
              <>
                <PlusCircle size={15} />
                <span>Submit Event</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
