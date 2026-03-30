import React, { useState, useEffect } from "react";
import { query, collection, where, onSnapshot, getDoc, doc, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../App";
import { User as UserIcon, Activity, Search, Filter, Download, Calendar } from "lucide-react";
import { cn } from "../lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const LogsPage = () => {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    const q = query(
      collection(db, "logs"), 
      where("tenantId", "==", profile.tenantId),
      orderBy("timestamp", "desc")
    );
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const logsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Fetch device and user names (caching could be better, but for now this works)
      const enrichedLogs = await Promise.all(logsData.map(async (log: any) => {
        try {
          const deviceSnap = await getDoc(doc(db, "devices", log.deviceId));
          const userSnap = await getDoc(doc(db, "users", log.userId));
          return {
            ...log,
            deviceName: deviceSnap.exists() ? deviceSnap.data().name : "Thiết bị đã xóa",
            userName: userSnap.exists() ? userSnap.data().displayName : "Người dùng hệ thống"
          };
        } catch (err) {
          return { ...log, deviceName: "N/A", userName: "N/A" };
        }
      }));
      
      setLogs(enrichedLogs);
      setLoading(false);
    });
    return unsubscribe;
  }, [profile]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.note || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    
    const matchesDate = !dateFilter || (log.timestamp?.toDate().toISOString().split('T')[0] === dateFilter);
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const exportPDF = () => {
    const doc = new jsPDF();
    
    // Add font support for Vietnamese (standard fonts don't support it well, but we'll try)
    doc.text("BAO CAO LICH SU CAP NHAT THIET BI", 14, 15);
    doc.setFontSize(10);
    doc.text(`Ngay xuat: ${new Date().toLocaleString("vi-VN")}`, 14, 22);
    doc.text(`Benh vien: ${profile?.tenantId || "N/A"}`, 14, 27);

    const tableData = filteredLogs.map(log => [
      log.timestamp?.toDate().toLocaleString("vi-VN"),
      log.userName,
      log.deviceName,
      log.status === "normal" ? "Binh thuong" : log.status === "warning" ? "Canh bao" : "Hu hong",
      log.note || "-"
    ]);

    autoTable(doc, {
      startY: 35,
      head: [["Thoi gian", "Nguoi thuc hien", "Thiet bi", "Trang thai", "Ghi chu"]],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`Lich-su-cap-nhat-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Lịch sử cập nhật hệ thống</h2>
        <button 
          onClick={exportPDF}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-all shadow-sm"
        >
          <Download size={18} />
          Xuất báo cáo (PDF)
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo thiết bị, người thực hiện hoặc ghi chú..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 shadow-sm appearance-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="normal">Bình thường</option>
            <option value="warning">Cảnh báo</option>
            <option value="broken">Hư hỏng</option>
          </select>
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="date" 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 shadow-sm cursor-pointer"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {filteredLogs.map((log) => (
              <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-blue-200 transition-colors">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                  <UserIcon size={20} className="text-slate-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900">
                      {log.userName} 
                      <span className="font-normal text-slate-500 mx-1">đã cập nhật</span> 
                      <span className="text-blue-600">{log.deviceName}</span>
                    </p>
                    <span className="text-xs text-slate-400">{log.timestamp?.toDate().toLocaleString("vi-VN")}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1 italic">"{log.note || "Không có ghi chú"}"</p>
                  <div className="mt-2">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border",
                      log.status === "normal" ? "bg-green-50 text-green-700 border-green-100" : log.status === "warning" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-red-50 text-red-700 border-red-100"
                    )}>
                      {log.status === "normal" ? "Bình thường" : log.status === "warning" ? "Cảnh báo" : "Hư hỏng"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {filteredLogs.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-400">Không tìm thấy lịch sử nào phù hợp với bộ lọc</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LogsPage;
