import { AlertCircle, Clock, Users, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";

function StatTrend({ value, label }: { value: "up" | "down" | "flat"; label: string }) {
  return (
    <div className={`flex items-center gap-1 text-xs mt-1.5 font-medium ${
      value === "up" ? "text-[#E53935]" : value === "down" ? "text-[#26A541]" : "text-[#9CA3AF]"
    }`}>
      {value === "up" ? <TrendingUp size={11} /> : value === "down" ? <TrendingDown size={11} /> : <Minus size={11} />}
      <span>{label}</span>
    </div>
  );
}

export default function KPICards({ events }: { events: any[] }) {
  const activeEvents = events.length;
  const criticalCount = events.filter(e => e.priority === "Critical" || e.priority === "High").length;
  const eventsWithResolution = events.filter(e => e.predicted_resolution_time_mins != null);
  const avgResolution = eventsWithResolution.length > 0
    ? Math.round(eventsWithResolution.reduce((acc, curr) => acc + curr.predicted_resolution_time_mins, 0) / eventsWithResolution.length)
    : 0;
  const eventsWithSeverity = events.filter(e => e.predicted_severity != null);
  const avgSeverity = eventsWithSeverity.length > 0
    ? (eventsWithSeverity.reduce((acc, curr) => acc + curr.predicted_severity, 0) / eventsWithSeverity.length).toFixed(1)
    : "0.0";
  const roadClosures = events.filter(e => e.road_closure).length;

  const kpis = [
    {
      label: "Active Incidents",
      value: activeEvents.toString(),
      sub: `${criticalCount} critical`,
      icon: AlertCircle,
      iconBg: "#FDECEA",
      iconColor: "#E53935",
      trend: activeEvents > 2 ? "up" : "flat" as "up" | "flat",
      trendLabel: activeEvents > 2 ? "+2 from last hour" : "Stable",
      borderAccent: "#E53935",
    },
    {
      label: "Avg Resolution",
      value: `${avgResolution}`,
      sub: "minutes",
      icon: Clock,
      iconBg: "#EBF2FF",
      iconColor: "#2874F0",
      trend: "down" as "down",
      trendLabel: "15% faster than avg",
      borderAccent: "#2874F0",
    },
    {
      label: "Avg Severity",
      value: `${avgSeverity}`,
      sub: "out of 10.0",
      icon: Activity,
      iconBg: "#FEF5E7",
      iconColor: "#F5A623",
      trend: "flat" as "flat",
      trendLabel: "Across all zones",
      borderAccent: "#F5A623",
    },
    {
      label: "Road Closures",
      value: roadClosures.toString(),
      sub: "active closures",
      icon: Users,
      iconBg: "#E8F5EB",
      iconColor: "#26A541",
      trend: roadClosures > 0 ? "up" as "up" : "flat" as "flat",
      trendLabel: roadClosures > 0 ? "Diversions in effect" : "All roads open",
      borderAccent: "#26A541",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {kpis.map(({ label, value, sub, icon: Icon, iconBg, iconColor, trend, trendLabel, borderAccent }) => (
        <div
          key={label}
          className="card-hover p-4 cursor-default"
          style={{ borderTop: `3px solid ${borderAccent}` }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-600 text-[#717171] truncate">{label}</div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-800 text-[#212121]">{value}</span>
                <span className="text-xs text-[#9CA3AF] font-medium">{sub}</span>
              </div>
              <StatTrend value={trend} label={trendLabel} />
            </div>
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ml-3"
              style={{ backgroundColor: iconBg }}
            >
              <Icon size={20} style={{ color: iconColor }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
