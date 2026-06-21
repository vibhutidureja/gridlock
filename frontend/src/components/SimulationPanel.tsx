"use client";

import { useState } from "react";
import { simulateImpact, resolveEvent } from "@/lib/api";
import {
  Cpu, Play, Bot, Loader2, ShieldCheck, AlertTriangle, Clock,
  Users, Target, TrendingUp, BarChart2, ChevronDown, ChevronUp, Info,
  MapPin, CheckCircle2, ClipboardList, AlertCircle, Sparkles, HelpCircle, Shield, Award, Brain
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

export function AIBrief({ brief }: { brief: string }) {
  const [expanded, setExpanded] = useState(true);

  // Parse sections out of the brief text
  const sections: { title: string; content: string }[] = [];
  const lines = brief.split("\n").map(l => l.trim()).filter(Boolean);
  let current: { title: string; content: string } | null = null;

  for (const line of lines) {
    // 1. Check for markdown headings like #, ##, ###, ####
    if (line.match(/^#+\s+/)) {
      if (current) sections.push(current);
      current = {
        title: line.replace(/^#+\s*/, "").replace(/[\*:]/g, "").trim(),
        content: ""
      };
    }
    // 2. Check for bold title lines like **INCIDENT OVERVIEW:** or **INCIDENT OVERVIEW**
    else if (line.startsWith("**") && line.endsWith("**")) {
      if (current) sections.push(current);
      current = {
        title: line.replace(/\*\*/g, "").replace(/[\*:]/g, "").trim(),
        content: ""
      };
    }
    // 3. Check for uppercase title lines ending in colon (e.g. "INCIDENT OVERVIEW:")
    else if (line.match(/^[A-Z\s_]{4,35}:$/)) {
      if (current) sections.push(current);
      current = {
        title: line.replace(/:$/, "").trim(),
        content: ""
      };
    }
    // 4. Content line
    else {
      if (current) {
        current.content += (current.content ? " " : "") + line;
      } else {
        // If there's no active section, start a default one
        current = {
          title: "Brief",
          content: line
        };
      }
    }
  }
  if (current) sections.push(current);

  const cleanSections = sections.filter(sec => sec.title.trim() || sec.content.trim());
  
  // Find if there is an empty-content header at the beginning
  let mainTitle = "AI Operational Brief";
  const finalSections: { title: string; content: string }[] = [];
  
  for (let i = 0; i < cleanSections.length; i++) {
    const sec = cleanSections[i];
    if (i === 0 && !sec.content.trim() && (sec.title.toLowerCase().includes("brief") || sec.title.toLowerCase().includes("operational"))) {
      mainTitle = sec.title;
    } else if (sec.title.trim() === "" && sec.content.trim() === "") {
      // Skip empty
    } else {
      finalSections.push(sec);
    }
  }

  // Helper parsing functions
  const parseKeyValues = (text: string): { key: string; value: string }[] => {
    const cleanText = text.replace(/^-\s*/, "");
    const parts = cleanText.split(/(?:\s*-\s*|\n+)/);
    const kvs: { key: string; value: string }[] = [];
    for (const part of parts) {
      const trimmedPart = part.trim();
      if (!trimmedPart) continue;
      
      const match = trimmedPart.match(/\*\*([^*:]+):\*\*\s*(.*)/) || trimmedPart.match(/([^*:]+):\s*(.*)/);
      if (match) {
        kvs.push({
          key: match[1].trim(),
          value: match[2].trim()
        });
      } else {
        kvs.push({
          key: "",
          value: trimmedPart
        });
      }
    }
    return kvs;
  };

  const parseTextWithBullets = (text: string) => {
    if (!text.includes("-") && !text.includes("\n")) {
      return { intro: text, bullets: [] };
    }
    
    // Check if there is an intro before the first bullet
    const firstDash = text.indexOf('-');
    let intro = "";
    let rest = text;
    if (firstDash > 0) {
       intro = text.substring(0, firstDash).trim();
       rest = text.substring(firstDash);
    }
    
    const parts = rest.split(/(?:\s+-\s+|^-\s+)/m).map(p => p.trim()).filter(Boolean);
    const bullets: any[] = [];

    for (const part of parts) {
      if (!part) continue;
      const match = part.match(/\*\*([^*:]+):\*\*\s*(.*)/) || part.match(/([^*:]+):\s*(.*)/);
      if (match) {
        bullets.push({
          key: match[1].trim(),
          value: match[2].trim()
        });
      } else {
        bullets.push({
          value: part
        });
      }
    }
    return { intro, bullets };
  };

  const parseNumberedItems = (text: string) => {
    const items = text.split(/(?=\d+\.\s+)/).filter(item => item.trim());
    const parsed = [];
    
    const splitBullets = (str: string) => {
      if (str.includes('\n')) return str.split(/\n+\s*(?:-\s*)?/).map(p => p.trim()).filter(Boolean);
      return str.split(/(?:\s+-\s+|^-\s+)/m).map(p => p.trim()).filter(p => p !== '-' && p.length > 0);
    };

    for (const item of items) {
      const cleanItem = item.trim();
      const numMatch = cleanItem.match(/^(\d+)\.\s*(.*)/);
      if (!numMatch) {
        parsed.push({ content: cleanItem });
        continue;
      }
      const num = numMatch[1];
      const rest = numMatch[2];
      
      const titleMatch = rest.match(/^\*\*([^*:]+):\*\*\s*(.*)/) || rest.match(/^([^*:]+):\s*(.*)/);
      if (titleMatch) {
        const title = titleMatch[1].trim();
        const content = titleMatch[2].trim();
        parsed.push({ num, title, subBullets: splitBullets(content) });
      } else {
        parsed.push({ num, subBullets: splitBullets(rest) });
      }
    }
    return parsed;
  };

  const cleanMarkdownText = (t: string) => t.replace(/\*\*/g, "").trim();

  const renderSection = (sec: { title: string; content: string }, index: number) => {
    const cleanTitle = (sec.title || "").replace(/[\*:]/g, "").trim().toUpperCase();
    
    if (cleanTitle === "END OF BRIEF" || (!sec.content.trim() && cleanTitle.includes("END"))) {
      return null;
    }

    // 1. INCIDENT OVERVIEW
    if (cleanTitle === "INCIDENT OVERVIEW") {
      const kvs = parseKeyValues(sec.content);
      return (
        <div key={index} className="bg-white border border-[#E0E3E8] rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#F1F3F6] pb-2 mb-3">
            <Info size={16} className="text-[#2874F0]" />
            <span className="text-xs font-bold text-[#212121] tracking-wide uppercase">Incident Overview</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {kvs.map((kv, i) => {
              let badgeBg = "bg-[#F8F9FB]";
              let badgeTextColor = "text-[#212121]";
              if (kv.key.toLowerCase().includes("severity")) {
                const valNum = parseFloat(kv.value);
                if (valNum >= 7) {
                  badgeBg = "bg-[#FDECEA]";
                  badgeTextColor = "text-[#D0021B]";
                } else if (valNum >= 4) {
                  badgeBg = "bg-[#FEF5E7]";
                  badgeTextColor = "text-[#F5A623]";
                } else {
                  badgeBg = "bg-[#E8F5EB]";
                  badgeTextColor = "text-[#26A541]";
                }
              } else if (kv.key.toLowerCase().includes("type")) {
                badgeBg = "bg-[#EBF2FF]";
                badgeTextColor = "text-[#2874F0]";
              }
              return (
                <div key={i} className={`p-3 rounded-md border border-gray-100 ${badgeBg} flex flex-col justify-between`}>
                  <span className="text-[10px] uppercase font-semibold text-[#717171] tracking-wider mb-1">{kv.key || "Detail"}</span>
                  <span className={`text-sm font-bold ${badgeTextColor}`}>{cleanMarkdownText(kv.value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 2. STRATEGY EVALUATION
    if (cleanTitle === "STRATEGY EVALUATION") {
      const kvs = parseKeyValues(sec.content);
      return (
        <div key={index} className="bg-white border border-[#E0E3E8] rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#F1F3F6] pb-2 mb-3">
            <Award size={16} className="text-[#2874F0]" />
            <span className="text-xs font-bold text-[#212121] tracking-wide uppercase">Strategy Evaluation</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {kvs.map((kv, i) => {
              const isTies = kv.key.toLowerCase().includes("ties");
              const isAction = kv.key.toLowerCase().includes("action");
              return (
                <div
                  key={i}
                  className={`p-3 rounded-md border ${
                    isTies
                      ? "bg-[#E8F5EB] border-[#26A541]/20 col-span-1"
                      : isAction
                      ? "bg-[#EBF2FF] border-[#2874F0]/20 col-span-1 sm:col-span-2"
                      : "bg-[#F8F9FB] border-gray-100 col-span-1"
                  }`}
                >
                  <div className="text-[10px] uppercase font-semibold text-[#717171] tracking-wider mb-0.5">{kv.key}</div>
                  <div className={`text-sm font-bold ${isTies ? "text-[#26A541]" : "text-[#212121]"}`}>
                    {cleanMarkdownText(kv.value)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 3. RATIONALE FOR STRATEGY
    if (cleanTitle.includes("RATIONALE")) {
      const { intro, bullets } = parseTextWithBullets(sec.content);
      return (
        <div key={index} className="bg-white border border-[#E0E3E8] rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#F1F3F6] pb-2 mb-3">
            <HelpCircle size={16} className="text-[#2874F0]" />
            <span className="text-xs font-bold text-[#212121] tracking-wide uppercase">Rationale for Strategy</span>
          </div>
          {intro && <p className="text-xs text-[#444] leading-relaxed mb-3">{cleanMarkdownText(intro)}</p>}
          {bullets.length > 0 && (
            <div className="space-y-2">
              {bullets.map((bullet, i) => (
                <div key={i} className="flex gap-2.5 items-start bg-[#F8F9FB] p-2.5 rounded-md border border-gray-100">
                  <CheckCircle2 size={14} className="text-[#26A541] shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed text-[#444]">
                    {bullet.key && <span className="font-bold text-[#212121]">{bullet.key}: </span>}
                    <span>{cleanMarkdownText(bullet.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 4. OPERATIONAL INSTRUCTIONS
    if (cleanTitle.includes("INSTRUCTIONS") || cleanTitle.includes("PROTOCOL")) {
      const items = parseNumberedItems(sec.content);
      return (
        <div key={index} className="bg-white border border-[#E0E3E8] rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#F1F3F6] pb-2 mb-3">
            <ClipboardList size={16} className="text-[#2874F0]" />
            <span className="text-xs font-bold text-[#212121] tracking-wide uppercase">Operational Instructions</span>
          </div>
          <div className="space-y-4">
            {items.map((item: any, i) => (
              <div key={i} className="relative pl-7 border-l border-gray-100 pb-1 last:pb-0">
                <div className="absolute -left-[11px] top-0.5 w-[22px] h-[22px] bg-[#EBF2FF] border border-[#2874F0]/30 text-[#2874F0] rounded-full flex items-center justify-center text-[10px] font-bold">
                  {item.num || (i + 1)}
                </div>
                
                {item.title && (
                  <div className="text-xs font-bold text-[#212121] mb-1">
                    {cleanMarkdownText(item.title)}
                  </div>
                )}
                
                {item.subBullets && item.subBullets.length > 0 ? (
                  <ul className="space-y-1.5 list-none">
                    {item.subBullets.map((sub: string, j: number) => (
                      <li key={j} className="text-xs text-[#555] leading-relaxed flex items-start gap-1.5">
                        <span className="text-[#2874F0] font-bold mt-[-2px]">•</span>
                        <span>{cleanMarkdownText(sub)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#555] leading-relaxed">{cleanMarkdownText(item.content)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 5. CONCLUSION
    if (cleanTitle.includes("CONCLUSION")) {
      return (
        <div key={index} className="bg-[#EBF2FF] border border-[#2874F0]/20 rounded-lg p-4 shadow-sm">
          <div className="flex items-start gap-2.5">
            <Sparkles size={16} className="text-[#2874F0] shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-bold text-[#2874F0] uppercase tracking-wider mb-1">Operational Conclusion</div>
              <p className="text-xs text-[#333] leading-relaxed font-medium">
                {cleanMarkdownText(sec.content)}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // 6. DEFAULT FALLBACK
    return (
      <div key={index} className="bg-white border border-[#E0E3E8] rounded-lg p-4 shadow-sm">
        {sec.title && (
          <div className="text-[10px] font-bold text-[#2874F0] uppercase tracking-wide mb-1.5">{sec.title}</div>
        )}
        <p className="text-xs text-[#444] leading-relaxed whitespace-pre-wrap">{cleanMarkdownText(sec.content)}</p>
      </div>
    );
  };

  return (
    <div className="mt-4 border border-[#E0E3E8] rounded-md overflow-hidden bg-white shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-[#F8F9FB] hover:bg-[#EBF2FF] transition-colors border-b border-[#E0E3E8]"
      >
        <div className="flex items-center gap-2">
          <Bot size={15} className="text-[#2874F0]" />
          <span className="text-sm font-semibold text-[#212121]">{mainTitle}</span>
          <span className="text-[10px] bg-[#EBF2FF] text-[#2874F0] px-2 py-0.5 rounded-full font-semibold">AI Assistant</span>
        </div>
        {expanded ? <ChevronUp size={15} className="text-[#717171]" /> : <ChevronDown size={15} className="text-[#717171]" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-4 bg-[#F8F9FB]">
          {finalSections.length > 0 ? (
            finalSections.map((sec, i) => renderSection(sec, i))
          ) : (
            <div className="bg-white border border-[#E0E3E8] rounded-lg p-4 shadow-sm">
              <p className="text-xs text-[#444] leading-relaxed whitespace-pre-wrap">{brief}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SimulationPanel({ events, onResult, onResolve }: { events: any[], onResult?: (result: any) => void, onResolve?: () => void }) {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [officers, setOfficers] = useState(5);
  const [barricades, setBarricades] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolveDesc, setResolveDesc] = useState("");
  const [resolveTime, setResolveTime] = useState(60);
  const [aiAccurate, setAiAccurate] = useState(true);
  const [resolving, setResolving] = useState(false);

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
      if (onResult) onResult(res);
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
            {result.rl_decision?.explanation && (
              <div className="bg-[#FEF5E7] border-2 border-[#F5A623] rounded-lg p-4 shadow-sm relative overflow-hidden mt-3">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#F5A623]" />
                <div className="flex items-center gap-2 border-b border-[#F5A623]/20 pb-2 mb-3">
                  <Brain size={16} className="text-[#F5A623]" />
                  <span className="text-xs font-bold text-[#F5A623] tracking-wide uppercase">RL Agent Explanation</span>
                </div>
                <p className="text-xs text-[#B07800] leading-relaxed font-semibold">
                  {result.rl_decision.explanation}
                </p>
              </div>
            )}

            {/* AI Brief - expandable sections (Render only if onResult is not provided) */}
            {!onResult && result.operational_brief && <AIBrief brief={result.operational_brief} />}

            {/* Resolve Form Block */}
            <div className="pt-4 mt-4 border-t border-[#E0E3E8]">
              {!showResolveForm ? (
                <button
                  onClick={() => {
                    setResolveTime(result.causal_data?.causal_impact_saved_mins ? Math.floor(60 - result.causal_data.causal_impact_saved_mins) : 60);
                    setShowResolveForm(true);
                  }}
                  className="w-full py-2.5 rounded border-2 border-[#26A541] text-[#26A541] font-bold text-sm hover:bg-[#E8F5EB] transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  Mark Issue as Resolved
                </button>
              ) : (
                <div className="bg-[#F8F9FB] border border-[#E0E3E8] rounded-lg p-4 space-y-3">
                  <div className="font-bold text-sm text-[#212121]">Resolution Details</div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#717171] mb-1">How was the issue resolved?</label>
                    <textarea 
                      value={resolveDesc}
                      onChange={e => setResolveDesc(e.target.value)}
                      className="form-input text-sm min-h-[60px]" 
                      placeholder="E.g. Diverted traffic via 1st Main and cleared the blockage."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#717171] mb-1">Time taken (mins)</label>
                      <input 
                        type="number" 
                        value={resolveTime}
                        onChange={e => setResolveTime(parseInt(e.target.value) || 0)}
                        className="form-input text-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#717171] mb-1">Was AI Advice Accurate?</label>
                      <select 
                        value={aiAccurate ? "Yes" : "No"}
                        onChange={e => setAiAccurate(e.target.value === "Yes")}
                        className="form-input text-sm"
                      >
                        <option>Yes</option>
                        <option>No</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button 
                      className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-2"
                      disabled={resolving}
                      onClick={async () => {
                        setResolving(true);
                        try {
                          await resolveEvent(selectedEventId, {
                            resolution_description: resolveDesc || "Resolved manually.",
                            actual_resolution_time_mins: resolveTime,
                            ai_accurate: aiAccurate
                          });
                          setShowResolveForm(false);
                          setResult(null);
                          setSelectedEventId("");
                          if (onResolve) onResolve();
                        } catch (e) {
                          console.error("Failed to resolve", e);
                        } finally {
                          setResolving(false);
                        }
                      }}
                    >
                      {resolving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Confirm Resolution
                    </button>
                    <button 
                      onClick={() => setShowResolveForm(false)}
                      className="px-4 py-2 border border-[#E0E3E8] rounded bg-white text-[#717171] text-sm font-semibold hover:bg-[#F1F3F6]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
