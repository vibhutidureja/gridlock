"use client";

import { Settings, Key, Bell, Database, Shield, Server } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-[#212121]">Settings</h1>
        <p className="text-xs text-[#717171] mt-0.5">Configure system preferences and integrations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { icon: Key, title: "API Keys", desc: "Manage OpenAI, MapMyIndia and other service keys.", color: "#2874F0" },
          { icon: Bell, title: "Notifications", desc: "Configure alert thresholds for critical events.", color: "#F5A623" },
          { icon: Database, title: "Database", desc: "PostgreSQL and Neo4j connection settings.", color: "#26A541" },
          { icon: Server, title: "Backend", desc: "Backend API URL and health monitoring.", color: "#9333EA" },
          { icon: Shield, title: "Permissions", desc: "Role-based access control for operators.", color: "#E53935" },
          { icon: Settings, title: "Preferences", desc: "Display language, timezone, and refresh rates.", color: "#717171" },
        ].map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="card-hover p-5 cursor-pointer">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + "15" }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <div className="font-semibold text-sm text-[#212121]">{title}</div>
                <div className="text-xs text-[#717171] mt-0.5">{desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-sm text-[#212121] mb-3">System Information</h2>
        <div className="space-y-2">
          {[
            ["Version", "UrbanFlow Nexus 1.0.0"],
            ["Backend", "http://127.0.0.1:8000"],
            ["Database", "PostgreSQL (PostGIS)"],
            ["Graph DB", "Neo4j"],
            ["ML Engine", "CatBoost + Scikit-Learn"],
            ["RL Agent", "MaskablePPO (Stable-Baselines3)"],
            ["AI Orchestrator", "LangChain + OpenAI GPT-4"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 border-b border-[#F1F3F6] last:border-0">
              <span className="text-xs text-[#717171]">{k}</span>
              <span className="text-xs font-semibold text-[#212121] font-mono">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
