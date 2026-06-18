import { LayoutDashboard, Map, Settings, History, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-64 glass-card border-l-0 border-t-0 border-b-0 hidden md:flex flex-col h-full sticky top-0 z-40">
      <div className="h-16 flex items-center px-6 border-b border-[var(--color-card-border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center">
            <AlertTriangle size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-wide text-white">UrbanFlow Nexus</span>
        </div>
      </div>
      
      <nav className="flex-1 py-6 px-4 space-y-2">
        <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--color-primary-hover)] bg-opacity-20 text-blue-400 font-medium transition-colors">
          <LayoutDashboard size={20} />
          Command Center
        </Link>
        <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-white/5 transition-colors">
          <Map size={20} />
          Live Map
        </Link>
        <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-white/5 transition-colors">
          <History size={20} />
          Interventions
        </Link>
      </nav>
      
      <div className="p-4 border-t border-[var(--color-card-border)]">
        <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-white/5 transition-colors">
          <Settings size={20} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
