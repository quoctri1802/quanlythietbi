import React from "react";
import { Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Stethoscope, 
  ScanLine, 
  History, 
  Users,
  LogOut, 
  Activity 
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../App";

const Sidebar = ({ isOpen, toggle }: { isOpen: boolean; toggle: () => void }) => {
  const { profile, logout } = useAuth();
  const navItems = [
    { name: "Tổng quan", icon: LayoutDashboard, path: "/dashboard" },
    { name: "Thiết bị", icon: Stethoscope, path: "/devices" },
    { name: "Quét mã QR", icon: ScanLine, path: "/scan" },
    { name: "Lịch sử", icon: History, path: "/logs" },
  ];

  if (profile?.role === "admin") {
    navItems.push({ name: "Người dùng", icon: Users, path: "/users" });
  }

  return (
    <>
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={toggle}
      />
      <aside className={cn(
        "fixed top-0 left-0 bottom-0 w-64 bg-slate-900 text-white z-50 transition-transform duration-300 transform lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Activity className="text-white" size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">MedTrack</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Firebase Live</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors group"
              onClick={() => window.innerWidth < 1024 && toggle()}
            >
              <item.icon size={20} className="text-slate-400 group-hover:text-blue-400" />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 p-2">
            <img src={profile?.photoURL || "https://picsum.photos/seed/user/100/100"} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
            <div className="overflow-hidden">
              <p className="font-medium truncate">{profile?.displayName}</p>
              <p className="text-xs text-slate-400 uppercase">{profile?.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-red-900/30 text-red-400 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
