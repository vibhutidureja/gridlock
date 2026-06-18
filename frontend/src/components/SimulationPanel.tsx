"use client";

import { useState } from "react";
import { simulateImpact } from "@/lib/api";
import { Bot, Play, ShieldAlert, Cpu } from "lucide-react";

export default function SimulationPanel({ events }: { events: any[] }) {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [officers, setOfficers] = useState(5);
  const [barricades, setBarricades] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSimulate = async () => {
    if (!selectedEventId) return;
    setLoading(true);
    
    const targetEvent = events.find((e) => e.id === selectedEventId);
    
    try {
      const res = await simulateImpact({
        event_id: selectedEventId,
        event_type: targetEvent?.event_type || "Accident",
        zone: targetEvent?.zone || "Central",
        predicted_severity: targetEvent?.predicted_severity || 5.0,
        available_officers: officers,
        available_barricades: barricades,
      });
      setResult(res);
    } catch (error) {
      console.error("Simulation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-xl flex flex-col overflow-hidden h-full">
      <div className="p-4 border-b border-[var(--color-card-border)] flex items-center gap-2">
        <Cpu className="text-[var(--color-primary)]" size={20} />
        <h3 className="text-white font-medium">AI Prescriptive Engine</h3>
      </div>
      
      <div className="p-4 flex-1 overflow-auto">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Target Event</label>
            <select 
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full bg-black/30 border border-[var(--color-card-border)] rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="" disabled>Select an active event...</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.event_type} at {e.zone} (Sev: {e.predicted_severity?.toFixed(1)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Available Officers</label>
              <input 
                type="number" 
                value={officers}
                onChange={(e) => setOfficers(parseInt(e.target.value) || 0)}
                className="w-full bg-black/30 border border-[var(--color-card-border)] rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Barricades</label>
              <input 
                type="number" 
                value={barricades}
                onChange={(e) => setBarricades(parseInt(e.target.value) || 0)}
                className="w-full bg-black/30 border border-[var(--color-card-border)] rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button 
            onClick={handleSimulate}
            disabled={!selectedEventId || loading}
            className="w-full py-2.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-pulse">Running Simulation...</span>
            ) : (
              <>
                <Play size={16} />
                Run Prescriptive Simulation
              </>
            )}
          </button>
        </div>

        {result && (
          <div className="mt-6 pt-6 border-t border-[var(--color-card-border)] animate-in fade-in slide-in-from-bottom-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Bot size={16} className="text-purple-400" />
              LangChain Operational Brief
            </h4>
            
            <div className="p-3 bg-black/40 rounded-lg border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
              <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                {result.operational_brief}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="text-xs text-green-400 mb-1">Expected Impact</div>
                <div className="text-xl font-bold text-white">-{result.expected_impact_reduction_pct.toFixed(1)}%</div>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="text-xs text-blue-400 mb-1">TIES Score</div>
                <div className="text-xl font-bold text-white">{result.ties_score.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
