import { AlertCircle, Clock, CheckCircle2, TrendingDown } from "lucide-react";

export default function KPICards({ events }: { events: any[] }) {
  const activeEvents = events.length;
  const avgResolution = events.length > 0 
    ? (events.reduce((acc, curr) => acc + (curr.predicted_resolution_time_mins || 0), 0) / events.length).toFixed(0) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="glass-card p-4 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm font-medium">Active Incidents</span>
          <div className="p-2 bg-red-500/20 rounded-lg text-red-400">
            <AlertCircle size={18} />
          </div>
        </div>
        <div className="text-3xl font-bold text-white">{activeEvents}</div>
        <div className="text-xs text-red-400 mt-2 flex items-center gap-1">
          <span>+2 from last hour</span>
        </div>
      </div>

      <div className="glass-card p-4 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm font-medium">Avg Resolution Time</span>
          <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
            <Clock size={18} />
          </div>
        </div>
        <div className="text-3xl font-bold text-white">{avgResolution} <span className="text-lg text-gray-500 font-normal">min</span></div>
        <div className="text-xs text-green-400 mt-2 flex items-center gap-1">
          <TrendingDown size={12} />
          <span>15% faster today</span>
        </div>
      </div>

      <div className="glass-card p-4 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm font-medium">Officers Deployed</span>
          <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
            <CheckCircle2 size={18} />
          </div>
        </div>
        <div className="text-3xl font-bold text-white">45</div>
        <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
          <span>Across 12 zones</span>
        </div>
      </div>

      <div className="glass-card p-4 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm font-medium">AI Optimization</span>
          <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
            <TrendingDown size={18} />
          </div>
        </div>
        <div className="text-3xl font-bold text-white">88%</div>
        <div className="text-xs text-green-400 mt-2 flex items-center gap-1">
          <span>Overall network efficiency</span>
        </div>
      </div>
    </div>
  );
}
