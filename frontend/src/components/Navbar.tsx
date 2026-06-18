import { Bell, Search, User } from "lucide-react";

export default function Navbar() {
  return (
    <header className="h-16 glass-card border-x-0 border-t-0 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex-1">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search events, zones..." 
            className="w-full bg-black/20 border border-[var(--color-card-border)] rounded-full pl-10 pr-4 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[var(--color-card)]"></span>
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 border border-gray-500 flex items-center justify-center">
          <User size={16} className="text-gray-300" />
        </div>
      </div>
    </header>
  );
}
