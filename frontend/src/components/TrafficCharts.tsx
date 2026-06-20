"use client";

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, CartesianGrid } from 'recharts';

export default function TrafficCharts({ events }: { events: any[] }) {
  // Aggregate data
  const zoneCounts: Record<string, number> = {};
  events.forEach(e => {
    zoneCounts[e.zone] = (zoneCounts[e.zone] || 0) + 1;
  });
  const barData = Object.keys(zoneCounts).map(zone => ({
    name: zone,
    count: zoneCounts[zone]
  })).sort((a, b) => b.count - a.count).slice(0, 5); // top 5 zones

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (barData.length === 0) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % barData.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [barData.length]);

  // Mock time-series data for congestion trend
  const timeData = [
    { time: "08:00", level: 30 },
    { time: "10:00", level: 65 },
    { time: "12:00", level: 45 },
    { time: "14:00", level: 50 },
    { time: "16:00", level: 75 },
    { time: "18:00", level: 90 },
    { time: "20:00", level: 60 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      {/* Bar Chart */}
      <div className="card p-4 h-[240px] flex flex-col">
        <h3 className="text-xs font-bold text-[#717171] uppercase tracking-wider mb-4">Events by Zone (Top 5)</h3>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#717171' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#717171' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === activeIndex ? '#E53935' : '#2874F0'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Area Chart */}
      <div className="card p-4 h-[240px] flex flex-col">
        <h3 className="text-xs font-bold text-[#717171] uppercase tracking-wider mb-4">Citywide Congestion Trend</h3>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F5A623" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F5A623" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E3E8" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#717171' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#717171' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="level" stroke="#F5A623" strokeWidth={3} fillOpacity={1} fill="url(#colorLevel)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
