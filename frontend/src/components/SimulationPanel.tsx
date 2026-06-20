"use client";

import { useState } from "react";
import { simulateImpact } from "@/lib/api";
import {
  Cpu, Play, Bot, Loader2, ShieldCheck, AlertTriangle, Clock,
  Users, Target, TrendingUp, BarChart2, ChevronDown, ChevronUp, Info
} from "lucide-react";

function ResultBox({ label, value, sub, color, icon: Icon }: {
  label: string; value: string; sub?: string; color: string; icon: any;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-md border" style={{ background: color + "15", borderColor: color + "30" }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + "20" }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>{label}</div>
        <div className="text-lg font-bold text-[#212121] leading-tight">{value}</div>
        {sub && <div className="text-[11px] text-[#717171] mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function TiesGauge({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct > 70 ? "#26A541" : pct > 45 ? "#F5A623" : "#E53935";
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="flex flex-col items-center py-3">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="#E0E3E8" strokeWidth="7" />
          <circle
            cx="40" cy="40" r="36" fill="none"
            stroke={color} strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-[#212121]">{pct.toFixed(0)}</span>
          <span className="text-[10px] text-[#717171] font-semibold">TIES%</span>
        </div>
      </div>
      <div className="text-xs mt-1 font-semibold" style={{ color }}>
        {pct > 70 ? "Excellent" : pct > 45 ? "Good" : "Needs Action"}
      </div>
    </div>
  );
}

function AIBrief({ brief }: { brief: string }) {
  const [expanded, setExpanded] = useState(true);

  // Parse sections out of the brief text
  const sections: { title: string; content: string }[] = [];
  const lines = brief.split("\n").filter(l => l.trim());
  let current: { title: string; content: string } | null = null;

  for (const line of lines) {
    if (line.startsWith("**") && line.endsWith("**")) {
      if (current) sections.push(current);
      current = { title: line.replace(/\*\*/g, ""), content: "" };
    } else if (line.startsWith("# ") || line.startsWith("## ")) {
      if (current) sections.push(current);
      current = { title: line.replace(/^#+\s*/, ""), content: "" };
    } else {
      if (current) current.content += (current.content ? " " : "") + line.trim();
      else sections.push({ title: "Brief", content: line.trim() });
    }
  }
  if (current) sections.push(current);

  const hasStructure = sections.length > 1;

  return (
    <div className="mt-4 border border-[#E0E3E8] rounded-md overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-[#F8F9FB] hover:bg-[#EBF2FF] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bot size={15} className="text-[#2874F0]" />
          <span className="text-sm font-semibold text-[#212121]">AI Operational Brief</span>
          <span className="text-[10px] bg-[#EBF2FF] text-[#2874F0] px-2 py-0.5 rounded-full font-semibold">LangChain</span>
        </div>
        {expanded ? <ChevronUp size={15} className="text-[#717171]" /> : <ChevronDown size={15} className="text-[#717171]" />}
      </button>

      {expanded && (
        <div className="p-3 space-y-2">
          {hasStructure ? sections.map((sec, i) => (
            <div key={i} className="ai-box">
              {sec.title && (
                <div className="text-[10px] font-bold text-[#2874F0] uppercase tracking-wide mb-1">{sec.title}</div>
              )}
              <p className="text-xs text-[#444] leading-relaxed">{sec.content}</p>
            </div>
          )) : (
            <div className="ai-box">
              <p className="text-xs text-[#444] leading-relaxed whitespace-pre-wrap">{brief}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SimulationPanel({ events }: { events: any[] }) {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [officers, setOfficers] = useState(5);
  const [barricades, setBarricades] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const handleSimulate = async () => {
    if (!selectedEventId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await simulateImpact({
        event_id: selectedEventId,
        event_type: selectedEvent?.event_type || "Accident",
        zone: selectedEvent?.zone || "Central",
        predicted_severity: selectedEvent?.predicted_severity || 5.0,
        predicted_resolution_time_mins: selectedEvent?.predicted_resolution_time_mins || 60,
        available_officers: officers,
        available_barricades: barricades,
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Simulation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="section-header shrink-0">
        <Cpu size={16} className="text-[#2874F0]" />
        <h3 className="font-semibold text-[#212121] text-sm">AI Prescriptive Engine</h3>
        <span className="ml-auto text-[10px] bg-[#EBF2FF] text-[#2874F0] px-2 py-0.5 rounded-full font-semibold">PPO + LangChain</span>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-4 space-y-4">
        {/* Event selector */}
        <div>
          <label className="block text-xs font-600 text-[#717171] mb-1.5">Target Event *</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="form-input"
            id="sim-event-select"
          >
            <option value="" disabled>Select an active event...</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                [{e.priority}] {e.event_type} — {e.zone} (Sev: {e.predicted_severity?.toFixed(1)})
              </option>
            ))}
          </select>
        </div>

        {/* Selected event preview */}
        {selectedEvent && (
          <div className="p-3 rounded-md bg-[#EBF2FF] border border-[#2874F0]/20 flex items-start gap-2">
            <Info size={14} className="text-[#2874F0] shrink-0 mt-0.5" />
            <div className="text-xs text-[#444]">
              <span className="font-semibold text-[#2874F0]">{selectedEvent.event_type}</span>
              {" "}in {selectedEvent.zone} — Severity {selectedEvent.predicted_severity?.toFixed(1)}/10,
              ETA {selectedEvent.predicted_resolution_time_mins} min
              {selectedEvent.road_closure && <span className="ml-1 text-[#E53935] font-semibold">(Road Closed)</span>}
            </div>
          </div>
        )}

        {/* Resources */}
        <div>
          <label className="block text-xs font-600 text-[#717171] mb-2">Available Resources</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Users size={11} className="text-[#717171]" />
                <label className="text-[11px] text-[#717171] font-medium">Officers</label>
              </div>
              <input
                type="number"
                min="0" max="50"
                value={officers}
                onChange={(e) => setOfficers(parseInt(e.target.value) || 0)}
                className="form-input text-center font-semibold"
                id="sim-officers"
              />
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <AlertTriangle size={11} className="text-[#717171]" />
                <label className="text-[11px] text-[#717171] font-medium">Barricades</label>
              </div>
              <input
                type="number"
                min="0" max="100"
                value={barricades}
                onChange={(e) => setBarricades(parseInt(e.target.value) || 0)}
                className="form-input text-center font-semibold"
                id="sim-barricades"
              />
            </div>
          </div>
        </div>

        {/* Run button */}
        <button
          onClick={handleSimulate}
          disabled={!selectedEventId || loading}
          id="run-simulation-btn"
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>AI Analysing...</span>
            </>
          ) : (
            <>
              <Play size={15} />
              <span>Run Prescriptive Simulation</span>
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-md bg-[#FDECEA] border border-[#FBCDD0] text-xs text-[#D0021B] font-medium">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-3 pt-2 border-t border-[#E0E3E8]">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-[#26A541]" />
              <span className="text-sm font-semibold text-[#212121]">Simulation Results</span>
            </div>

            {/* Strategy */}
            <div className="p-3 rounded-md border border-[#2874F0]/30 bg-[#EBF2FF]">
              <div className="text-[10px] font-bold text-[#2874F0] uppercase tracking-wide mb-1">Recommended Strategy</div>
              <div className="font-bold text-sm text-[#212121]">{result.recommended_strategy}</div>
            </div>

            {/* TIES Gauge + Metrics */}
            <div className="grid grid-cols-3 gap-2 items-center">
              <div className="col-span-1">
                <TiesGauge score={result.ties_score} />
              </div>
              <div className="col-span-2 space-y-2">
                <ResultBox
                  label="Time Saved"
                  value={`${result.causal_data?.causal_impact_saved_mins?.toFixed(1) ?? 0} min`}
                  icon={Clock}
                  color="#26A541"
                />
                <ResultBox
                  label="AI Confidence"
                  value={`${result.causal_data?.confidence_pct?.toFixed(0) ?? 0}%`}
                  icon={TrendingUp}
                  color="#2874F0"
                />
              </div>
            </div>

            {/* Resource Allocated */}
            <ResultBox
              label="Resources Allocated"
              value={`${result.resources_allocated?.officers ?? 0} Officers · ${result.resources_allocated?.barricades ?? 0} Barricades`}
              icon={Users}
              color="#F5A623"
            />

            {/* RL Explanation */}
            {result.causal_data?.explanation && (
              <div className="ai-box">
                <div className="text-[10px] font-bold text-[#F5A623] uppercase tracking-wide mb-1">RL Agent Explanation</div>
                <p className="text-xs text-[#444] leading-relaxed">{result.causal_data.explanation}</p>
                <div className="mt-2 text-right text-[10px] text-[#9CA3AF] font-mono">
                  Latency: {result.causal_data?.calc_time_ms?.toFixed(0) ?? 0}ms
                </div>
              </div>
            )}

            {/* AI Brief - expandable sections */}
            {result.operational_brief && <AIBrief brief={result.operational_brief} />}
          </div>
        )}
      </div>
    </div>
  );
}
