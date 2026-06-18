import { MapPin, Clock, AlertTriangle } from "lucide-react";

export default function EventFeed({ events }: { events: any[] }) {
  if (events.length === 0) {
    return (
      <div className="glass-card p-6 rounded-xl h-[400px] flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
          <CheckCircle className="text-green-500" size={32} />
        </div>
        <h3 className="text-white font-medium text-lg">Network Clear</h3>
        <p className="text-gray-400 text-sm mt-2">No active traffic events recorded in the system.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl h-[400px] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-[var(--color-card-border)] flex items-center justify-between">
        <h3 className="text-white font-medium">Live Event Feed</h3>
        <span className="text-xs bg-[var(--color-primary)] text-white px-2 py-1 rounded-full font-medium">
          {events.length} Active
        </span>
      </div>
      
      <div className="flex-1 overflow-auto p-2 space-y-2 custom-scrollbar">
        {events.map((event) => (
          <div key={event.id} className="p-3 rounded-lg bg-black/20 hover:bg-black/40 border border-transparent hover:border-[var(--color-card-border)] transition-all cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {event.priority === "High" ? (
                  <AlertTriangle size={16} className="text-red-400" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                )}
                <span className="font-medium text-gray-200 group-hover:text-white transition-colors">{event.event_type}</span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                Sev: {event.predicted_severity?.toFixed(1) || "N/A"}
              </span>
            </div>
            
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <MapPin size={12} />
                <span>{event.zone} Zone</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock size={12} />
                <span>ETA: {event.predicted_resolution_time_mins} mins</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple fallback icon for empty state
function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
