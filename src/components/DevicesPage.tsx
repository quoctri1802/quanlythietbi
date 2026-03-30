import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth, Device } from "../App";
import { Stethoscope, Plus, CheckCircle, AlertTriangle, ChevronRight, X, Search, ArrowUp, ArrowDown, Filter, QrCode, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeCanvas } from "qrcode.react";

const DevicesPage = () => {
  const { profile } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [qrModalDevice, setQrModalDevice] = useState<Device | null>(null);
  const [newDevice, setNewDevice] = useState({ name: "", model: "", serialNumber: "", department: "" });
  
  // Filtering & Sorting State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof Device>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const departments = Array.from(new Set(devices.map(d => d.department))).sort();

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, "devices"), where("tenantId", "==", profile.tenantId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDevices(snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Device));
    });
    return unsubscribe;
  }, [profile]);

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    await addDoc(collection(db, "devices"), {
      ...newDevice,
      tenantId: profile.tenantId,
      status: "normal",
      lastUpdate: serverTimestamp(),
      createdAt: serverTimestamp()
    });
    setIsModalOpen(false);
    setNewDevice({ name: "", model: "", serialNumber: "", department: "" });
  };

  const downloadQRCode = (device: Device) => {
    const canvas = document.getElementById(`qr-list-${device.id}`) as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_${device.name}_${device.serialNumber}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const handleSort = (field: keyof Device) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredAndSortedDevices = devices
    .filter(device => {
      const matchesSearch = 
        device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.department.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "not-updated" 
          ? (!device.lastUpdate || device.lastUpdate.toDate() < new Date(new Date().setHours(0,0,0,0))) 
          : device.status === statusFilter);
      const matchesDepartment = departmentFilter === "all" || device.department === departmentFilter;
      
      return matchesSearch && matchesStatus && matchesDepartment;
    })
    .sort((a, b) => {
      const aValue = (a[sortField] || "").toString().toLowerCase();
      const bValue = (b[sortField] || "").toString().toLowerCase();
      
      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ field }: { field: keyof Device }) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Danh sách thiết bị</h2>
        {profile?.role === "admin" && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-md"
          >
            <Plus size={18} />
            Thêm thiết bị
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo tên, số serial hoặc khoa..." 
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
            <option value="not-updated">Chưa báo cáo hôm nay</option>
            <option value="normal">Bình thường</option>
            <option value="warning">Cảnh báo</option>
            <option value="broken">Hư hỏng</option>
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 shadow-sm appearance-none cursor-pointer"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="all">Tất cả khoa/phòng</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th 
                  className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center">
                    Thiết bị <SortIcon field="name" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => handleSort("department")}
                >
                  <div className="flex items-center">
                    Khoa/Phòng <SortIcon field="department" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center">
                    Trạng thái <SortIcon field="status" />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredAndSortedDevices.map((device) => (
                <tr key={device.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link to={`/device/${device.id}`} className="flex items-center gap-3 group">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Stethoscope size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{device.name}</p>
                          {(!device.lastUpdate || device.lastUpdate.toDate() < new Date(new Date().setHours(0,0,0,0))) && (
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Trễ báo cáo</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">SN: {device.serialNumber}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{device.department}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
                      device.status === "normal" ? "bg-green-100 text-green-800" : device.status === "warning" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                    )}>
                      {device.status === "normal" ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                      {device.status === "normal" ? "Bình thường" : device.status === "warning" ? "Cảnh báo" : "Hư hỏng"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button 
                        onClick={() => setQrModalDevice(device)}
                        className="text-slate-400 hover:text-blue-600 transition-colors"
                        title="Xem mã QR"
                      >
                        <QrCode size={18} />
                      </button>
                      <Link to={`/device/${device.id}`} className="text-slate-400 hover:text-blue-600 transition-colors">
                        <ChevronRight size={18} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAndSortedDevices.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">Không tìm thấy thiết bị nào phù hợp</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Thêm thiết bị mới</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddDevice} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tên thiết bị</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                    value={newDevice.name}
                    onChange={e => setNewDevice({...newDevice, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                      value={newDevice.model}
                      onChange={e => setNewDevice({...newDevice, model: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Số Serial</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                      value={newDevice.serialNumber}
                      onChange={e => setNewDevice({...newDevice, serialNumber: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Khoa/Phòng</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                    value={newDevice.department}
                    onChange={e => setNewDevice({...newDevice, department: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">
                  Lưu thiết bị
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {qrModalDevice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setQrModalDevice(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Mã QR thiết bị</h3>
                <button onClick={() => setQrModalDevice(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="p-8 flex flex-col items-center gap-6">
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <QRCodeCanvas 
                    id={`qr-list-${qrModalDevice.id}`}
                    value={`${window.location.origin}/device/${qrModalDevice.id}`} 
                    size={200} 
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-900">{qrModalDevice.name}</p>
                  <p className="text-sm text-slate-500">SN: {qrModalDevice.serialNumber}</p>
                </div>
                <button 
                  onClick={() => downloadQRCode(qrModalDevice)}
                  className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  <Download size={18} />
                  Tải mã QR (.png)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DevicesPage;
