"use client";

import { useEffect, useState, useCallback } from "react";
import { getEvents } from "@/lib/api";
import SimulationPanel, { AIBrief } from "@/components/SimulationPanel";
import { Cpu } from "lucide-react";

export default function AIPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const data = await getEvents();
      setEvents(data || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 15000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h1 className="text-xl font-bold text-[#212121]">AI Engine</h1>
        <p className="text-xs text-[#717171] mt-0.5">PPO Reinforcement Learning + LangChain Operational Intelligence</p>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4 min-h-0">
        {/* Simulation Panel */}
        <div style={{ minHeight: "600px" }}>
          <SimulationPanel events={events} onResult={setSimulationResult} onResolve={() => fetchEvents()} />
        </div>

        {/* Info Panel or Result Panel */}
        <div className="overflow-auto custom-scrollbar">
          {simulationResult ? (
            <div className="h-full">
              {simulationResult.operational_brief && (
                <AIBrief brief={simulationResult.operational_brief} />
              )}
            </div>
          ) : (
            <div className="card p-6 h-full">
              <div className="flex items-center gap-2 mb-4">
                <Cpu size={18} className="text-[#2874F0]" />
                <h2 className="font-bold text-[#212121]">About the AI Engine</h2>
              </div>

              <div className="space-y-4">
                {[
                  {
                    title: "Maskable PPO Agent",
                    color: "#2874F0",
                    desc: "A stateful Reinforcement Learning agent trained with Proximal Policy Optimization (PPO) that dynamically prescribes the optimal intervention strategy based on live traffic congestion, city-wide load, and historical performance.",
                  },
                  {
                    title: "TIES Score",
                    color: "#26A541",
                    desc: "Traffic Intervention Effectiveness Score — an economic optimization metric (0–100%) ensuring limited resources (officers, barricades) are deployed efficiently for maximum impact.",
                  },
                  {
                    title: "Causal Inference",
                    color: "#F5A623",
                    desc: "Counterfactual analysis compares 'doing nothing' vs. the recommended intervention to mathematically calculate how many minutes of delay are saved by taking action.",
                  },
                  {
                    title: "LangChain Operational Brief",
                    color: "#9333EA",
                    desc: "The AI orchestrator uses GPT-4 via LangChain to generate a detailed, human-readable operational brief that commanders can use to brief their teams immediately.",
                  },
                ].map(({ title, color, desc }) => (
                  <div key={title} className="ai-box border-l-2" style={{ borderLeftColor: color }}>
                    <div className="text-xs font-bold mb-1" style={{ color }}>{title}</div>
                    <p className="text-xs text-[#444] leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-[#EBF2FF] border border-[#2874F0]/20 rounded-md">
                <div className="text-xs font-bold text-[#2874F0] mb-1">How to Use</div>
                <ol className="text-xs text-[#444] space-y-1 list-decimal list-inside leading-relaxed">
                  <li>Select an active event from the dropdown</li>
                  <li>Enter available officer & barricade counts</li>
                  <li>Click "Run Prescriptive Simulation"</li>
                  <li>Review the TIES score, saved time, and AI brief</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
