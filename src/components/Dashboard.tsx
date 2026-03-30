import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth, Device, Log } from "../App";
import { Stethoscope, AlertTriangle, X, Activity, Download, ChevronRight, CheckCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import axios from "axios";

const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ total: 0, warning: 0, broken: 0, notUpdated: 0 });
  const [recentLogs, setRecentLogs] = useState<Log[]>([]);
  const [problemDevices, setProblemDevices] = useState<Device[]>([]);

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, "devices"), where("tenantId", "==", profile.tenantId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Device);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const notUpdated = docs.filter(d => {
        if (!d.lastUpdate) return true;
        return d.lastUpdate.toDate() < today;
      }).length;

      setStats({
        total: docs.length,
        warning: docs.filter(d => d.status === "warning").length,
        broken: docs.filter(d => d.status === "broken").length,
        notUpdated
      });

      setProblemDevices(docs.filter(d => {
        const isProblemStatus = d.status === "warning" || d.status === "broken";
        const isNotUpdated = !d.lastUpdate || d.lastUpdate.toDate() < today;
        return isProblemStatus || isNotUpdated;
      }));
    });
    return unsubscribe;
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, "logs"), where("tenantId", "==", profile.tenantId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Log);
      setRecentLogs(docs.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds).slice(0, 5));
    });
    return unsubscribe;
  }, [profile]);

  const handleExport = async () => {
    if (!profile) return;
    try {
      const q = query(collection(db, "devices"), where("tenantId", "==", profile.tenantId));
      const snapshot = await axios.post("/api/report", { 
        devices: (await import("firebase/firestore")).getDocs(q).then(s => s.docs.map(d => d.data())), 
        tenantName: "TTYT Liên Chiểu" 
      }, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([snapshot.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'report.pdf');
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Tổng quan hệ thống</h2>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <Download size={18} />
          Xuất báo cáo
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Tổng thiết bị", value: stats.total, icon: Stethoscope, color: "blue" },
          { label: "Chưa báo cáo", value: stats.notUpdated, icon: Clock, color: "slate" },
          { label: "Cần bảo trì", value: stats.warning, icon: AlertTriangle, color: "amber" },
          { label: "Đang hư hỏng", value: stats.broken, icon: X, color: "red" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "p-3 rounded-xl", 
                stat.color === "blue" ? "bg-blue-50 text-blue-600" : 
                stat.color === "amber" ? "bg-amber-50 text-amber-600" : 
                stat.color === "red" ? "bg-red-50 text-red-600" :
                "bg-slate-50 text-slate-600"
              )}>
                <stat.icon size={24} />
              </div>
              {stat.label === "Chưa báo cáo" && stat.value > 0 && (
                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            <p className="text-slate-500 font-medium">{stat.label}</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Thiết bị cần chú ý</h3>
            <span className="text-xs font-bold px-2 py-1 bg-red-50 text-red-600 rounded-lg">
              {problemDevices.length} thiết bị
            </span>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {problemDevices.map((device) => (
              <Link 
                key={device.id} 
                to={`/device/${device.id}`}
                className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl border border-transparent hover:border-slate-100 transition-all group"
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  device.status === "warning" ? "bg-amber-50 text-amber-600" : 
                  device.status === "broken" ? "bg-red-50 text-red-600" :
                  "bg-slate-50 text-slate-400"
                )}>
                  {device.status === "warning" ? <AlertTriangle size={20} /> : 
                   device.status === "broken" ? <X size={20} /> : 
                   <Clock size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{device.name}</p>
                    {(!device.lastUpdate || device.lastUpdate.toDate() < new Date(new Date().setHours(0,0,0,0))) && (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Trễ báo cáo</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{device.department} • SN: {device.serialNumber}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
              </Link>
            ))}
            {problemDevices.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle size={32} className="mx-auto mb-2 opacity-20 text-green-500" />
                <p className="text-sm">Tất cả thiết bị đều hoạt động bình thường</p>
              </div>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Cập nhật mới nhất</h3>
          <div className="space-y-4">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  log.status === "normal" ? "bg-green-50 text-green-600" : log.status === "warning" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                )}>
                  <Activity size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">Cập nhật trạng thái: {log.status === "normal" ? "Bình thường" : log.status === "warning" ? "Cảnh báo" : "Hư hỏng"}</p>
                  <p className="text-xs text-slate-500 truncate max-w-[200px]">{log.note}</p>
                </div>
                <span className="text-xs text-slate-400">{log.timestamp?.toDate().toLocaleTimeString("vi-VN")}</span>
              </div>
            ))}
            {recentLogs.length === 0 && <p className="text-center text-slate-400 py-8">Chưa có hoạt động nào</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
