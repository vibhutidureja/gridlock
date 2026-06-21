"use client";

import { LayoutDashboard, Map, History, AlertTriangle, Activity, ChevronRight, BarChart2, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { icon: LayoutDashboard, label: "Command Center", href: "/", badge: null },
  { icon: Map, label: "Live Map", href: "/map", badge: "LIVE" },
  { icon: AlertTriangle, label: "Active Events", href: "/events", badge: null },
  { icon: History, label: "Interventions", href: "/interventions", badge: null },
  { icon: BarChart2, label: "Analytics", href: "/analytics", badge: null },
  { icon: Activity, label: "AI Engine", href: "/ai", badge: "NEW" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, icon: "🚨", text: "Protest detected in Central zone", time: "2 min ago", read: false },
    { id: 2, icon: "⚠", text: "Route diversion active for Airport Rd", time: "15 min ago", read: false },
    { id: 3, icon: "✅", text: "Road reopened near MG Road", time: "1 hour ago", read: true }
  ];
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <aside className="w-[240px] bg-white border-r border-[#E0E3E8] hidden md:flex flex-col h-full sticky top-0 z-40 shadow-sm">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 bg-[#2874F0]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <AlertTriangle size={16} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight tracking-wide">UrbanFlow Nexus</div>
            <div className="text-white/70 text-[10px] font-medium tracking-widest uppercase">Command Center</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-auto custom-scrollbar">
        <div className="px-3 mb-2">
          <span className="text-[10px] font-700 text-[#9CA3AF] uppercase tracking-widest px-2">Main Menu</span>
        </div>
        <ul className="space-y-0.5 px-2">
          {navItems.map(({ icon: Icon, label, href, badge }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 group relative ${
                    isActive
                      ? "bg-[#EBF2FF] text-[#2874F0] font-semibold border-l-3 border-[#2874F0]"
                      : "text-[#444] hover:bg-[#F8F9FB] hover:text-[#2874F0] font-medium"
                  }`}
                  style={isActive ? { borderLeft: "3px solid #2874F0", paddingLeft: "10px" } : {}}
                >
                  <Icon size={18} className={isActive ? "text-[#2874F0]" : "text-[#717171] group-hover:text-[#2874F0]"} />
                  <span className="flex-1">{label}</span>
                  {badge && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      badge === "LIVE" ? "bg-[#E53935] text-white animate-pulse" :
                      badge === "NEW" ? "bg-[#FFB800] text-[#212121]" : ""
                    }`}>
                      {badge}
                    </span>
                  )}
                  {isActive && <ChevronRight size={14} className="text-[#2874F0] ml-auto" />}
                </Link>
              </li>
            );
          })}
        </ul>

      </nav>

      {/* Notifications Footer */}
      <div className="p-4 border-t border-[#E0E3E8] bg-white shrink-0 flex items-center justify-between relative group">
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 rounded-full hover:bg-[#F1F3F6] relative transition-colors"
          >
            <Bell size={18} className="text-[#444]" />
            {unreadCount > 0 && (
              <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#D0021B] text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </div>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-[#E0E3E8] rounded-lg shadow-lg overflow-hidden z-50">
              <div className="bg-[#F8F9FB] px-3 py-2 border-b border-[#E0E3E8] flex justify-between items-center">
                <span className="text-xs font-bold text-[#212121]">Notifications</span>
                <span className="text-[10px] text-[#2874F0] cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="max-h-60 overflow-auto">
                {notifications.map(n => (
                  <div key={n.id} className={`p-3 border-b border-[#F1F3F6] flex gap-2 ${!n.read ? 'bg-[#EBF2FF]/30' : ''}`}>
                    <span className="text-sm">{n.icon}</span>
                    <div>
                      <div className={`text-xs ${!n.read ? 'font-bold text-[#212121]' : 'text-[#444]'}`}>{n.text}</div>
                      <div className="text-[10px] text-[#9CA3AF] mt-0.5">{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* System Status */}
      <div className="p-3 border-t border-[#E0E3E8] bg-[#F8F9FB]">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-2 h-2 rounded-full bg-[#26A541] animate-pulse" />
          <span className="text-xs text-[#717171] font-medium">All systems operational</span>
        </div>
        <div className="mt-2 px-2">
          <div className="text-[10px] text-[#9CA3AF]">Backend API</div>
          <div className="flex items-center gap-1 mt-0.5">
            <div className="h-1.5 flex-1 bg-[#E0E3E8] rounded-full overflow-hidden">
              <div className="h-full w-[82%] bg-[#26A541] rounded-full" />
            </div>
            <span className="text-[10px] text-[#26A541] font-medium">82ms</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
