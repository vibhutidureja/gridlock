"use client";

import { Bell, Search, User, RefreshCw, Wifi } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [notifications] = useState(3);

  return (
    <header className="h-14 bg-[#2874F0] flex items-center justify-between px-4 sticky top-0 z-30 shadow-md">
      {/* Left - Search */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={16} />
          <input
            type="text"
            id="global-search"
            placeholder="Search events, zones, routes..."
            className="w-full bg-white/15 border border-white/25 rounded-sm pl-9 pr-4 py-1.5 text-sm text-white placeholder-white/60 focus:outline-none focus:bg-white/25 transition-colors font-medium"
          />
        </div>
      </div>

      {/* Center - Status */}
      <div className="hidden lg:flex items-center gap-6 mx-6">
        <div className="flex items-center gap-1.5">
          <Wifi size={14} className="text-white/80" />
          <span className="text-white/80 text-xs font-medium">Connected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#FFB800] animate-pulse" />
          <span className="text-white/80 text-xs font-medium">AI Engine Active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <RefreshCw size={12} className="text-white/80" />
          <span className="text-white/80 text-xs font-medium">Auto-refresh: 10s</span>
        </div>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-3">
        <button
          id="notification-btn"
          className="relative p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-sm transition-colors"
          title="Notifications"
        >
          <Bell size={19} />
          {notifications > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#FFB800] text-[#212121] text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-[#2874F0]">
              {notifications}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2 border-l border-white/20 pl-3 ml-1">
          <div className="w-7 h-7 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
          <div className="hidden lg:block">
            <div className="text-white text-xs font-semibold leading-tight">Admin</div>
            <div className="text-white/60 text-[10px]">Traffic Control</div>
          </div>
        </div>
      </div>
    </header>
  );
}
