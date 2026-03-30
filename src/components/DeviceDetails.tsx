import React, { useState, useEffect, useRef } from "react";
import { doc, onSnapshot, query, collection, where, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth, Device, Log } from "../App";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Activity, CheckCircle, AlertTriangle, X, BrainCircuit, History, ArrowLeft, Download, Clock } from "lucide-react";
import { cn } from "../lib/utils";
import { QRCodeCanvas } from "qrcode.react";
import axios from "axios";

const DeviceDetails = () => {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const updateSectionRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const isFromScan = new URLSearchParams(location.search).get("scan") === "true";

  useEffect(() => {
    if (isFromScan && !loading && device && updateSectionRef.current) {
      updateSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isFromScan, loading, device]);

  const downloadQRCode = () => {
    const canvas = document.getElementById("qr-code-canvas") as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_${device?.name}_${device?.serialNumber}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  useEffect(() => {
    if (!id) return;
    const unsubDevice = onSnapshot(doc(db, "devices", id), (doc) => {
      if (doc.exists()) setDevice({ id: doc.id, ...doc.data() } as Device);
      setLoading(false);
    });
    const qLogs = query(collection(db, "logs"), where("deviceId", "==", id));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Log).sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds));
    });
    return () => { unsubDevice(); unsubLogs(); };
  }, [id]);

  const handleSubmitStatus = async (status: "normal" | "warning" | "broken") => {
    if (!device || !profile || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "logs"), {
        deviceId: device.id,
        tenantId: profile.tenantId,
        userId: profile.uid,
        status,
        note,
        timestamp: serverTimestamp()
      });
      await updateDoc(doc(db, "devices", device.id), {
        status,
        lastUpdate: serverTimestamp()
      });

      if (status === "broken" && device.status !== "broken") {
        const deviceUrl = `${window.location.origin}/device/${device.id}`;
        await axios.post("/api/alert", {
          message: `🚨 <b>CẢNH BÁO HƯ HỎNG</b>\n\n<b>Thiết bị:</b> ${device.name}\n<b>Khoa:</b> ${device.department}\n<b>Người báo:</b> ${profile.displayName}\n<b>Ghi chú:</b> ${note || "Không có"}\n\n<a href="${deviceUrl}">Xem chi tiết thiết bị</a>`
        });
      }

      setNote("");
      alert("Cập nhật trạng thái thành công!");
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!device || logs.length === 0) return;
    setAnalyzing(true);
    try {
      const response = await axios.post("/api/ai/predict", {
        logs: logs.slice(0, 10).map(l => ({ status: l.status, note: l.note, date: l.timestamp?.toDate() })),
        deviceName: device.name
      });
      setAiAnalysis(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Activity className="animate-spin text-blue-600" size={40} /></div>;
  if (!device) return <div className="text-center py-20">Không tìm thấy thiết bị</div>;

  const isNotUpdatedToday = !device.lastUpdate || device.lastUpdate.toDate() < new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {isNotUpdatedToday && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-800 animate-pulse">
          <Clock size={20} className="shrink-0" />
          <p className="text-sm font-medium">Thiết bị này chưa được báo cáo trạng thái trong ngày hôm nay. Vui lòng cập nhật bên dưới.</p>
        </div>
      )}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-48 flex flex-col items-center gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <QRCodeCanvas 
              id="qr-code-canvas"
              value={`${window.location.origin}/device/${device.id}`} 
              size={120} 
              level="H"
              includeMargin={true}
            />
          </div>
          <button 
            onClick={downloadQRCode}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all"
          >
            <Download size={14} />
            Tải mã QR
          </button>
          <p className="text-[10px] text-slate-400 font-mono">ID: {device.id}</p>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-bold text-slate-900">{device.name}</h2>
            <span className={cn(
              "px-3 py-1 rounded-full text-sm font-bold",
              device.status === "normal" ? "bg-green-100 text-green-800" : device.status === "warning" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
            )}>
              {device.status === "normal" ? "Bình thường" : device.status === "warning" ? "Cảnh báo" : "Hư hỏng"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Model</p>
              <p className="font-medium">{device.model || "N/A"}</p>
            </div>
            <div>
              <p className="text-slate-500">Số Serial</p>
              <p className="font-medium">{device.serialNumber}</p>
            </div>
            <div>
              <p className="text-slate-500">Khoa/Phòng</p>
              <p className="font-medium">{device.department}</p>
            </div>
            <div>
              <p className="text-slate-500">Cập nhật cuối</p>
              <p className="font-medium">{device.lastUpdate?.toDate().toLocaleString("vi-VN")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          ref={updateSectionRef}
          className={cn(
            "bg-white p-6 rounded-3xl border shadow-sm transition-all duration-1000",
            isFromScan ? "border-blue-500 ring-4 ring-blue-500/10" : "border-slate-200"
          )}
        >
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Activity size={20} className="text-blue-600" />
            Cập nhật trạng thái hàng ngày
          </h3>
          <textarea 
            placeholder="Nhập ghi chú tình trạng thiết bị..."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all h-32 mb-4"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <div className="grid grid-cols-3 gap-3">
            <button 
              disabled={submitting}
              onClick={() => handleSubmitStatus("normal")}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-all border border-green-100"
            >
              <CheckCircle size={24} />
              <span className="text-xs font-bold">Bình thường</span>
            </button>
            <button 
              disabled={submitting}
              onClick={() => handleSubmitStatus("warning")}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all border border-amber-100"
            >
              <AlertTriangle size={24} />
              <span className="text-xs font-bold">Cảnh báo</span>
            </button>
            <button 
              disabled={submitting}
              onClick={() => handleSubmitStatus("broken")}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition-all border border-red-100"
            >
              <X size={24} />
              <span className="text-xs font-bold">Hư hỏng</span>
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <BrainCircuit size={20} className="text-purple-600" />
              Phân tích AI (Gemini)
            </h3>
            <button 
              onClick={handleAIAnalysis}
              disabled={analyzing || logs.length === 0}
              className="text-xs font-bold text-purple-600 hover:underline disabled:opacity-50"
            >
              {analyzing ? "Đang phân tích..." : "Chạy phân tích"}
            </button>
          </div>
          
          {aiAnalysis ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Rủi ro hư hỏng:</span>
                <span className={cn(
                  "font-bold",
                  aiAnalysis.risk_percentage > 70 ? "text-red-600" : aiAnalysis.risk_percentage > 30 ? "text-amber-600" : "text-green-600"
                )}>{aiAnalysis.risk_percentage}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className={cn(
                  "h-full transition-all duration-1000",
                  aiAnalysis.risk_percentage > 70 ? "bg-red-500" : aiAnalysis.risk_percentage > 30 ? "bg-amber-500" : "bg-green-500"
                )} style={{ width: `${aiAnalysis.risk_percentage}%` }} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Dự đoán 7 ngày tới:</p>
                <p className="text-sm text-slate-600 italic">"{aiAnalysis.prediction_7_days}"</p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Gợi ý bảo trì:</p>
                <ul className="text-xs text-slate-600 list-disc pl-4 space-y-1 mt-1">
                  {aiAnalysis.suggestions?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-center">
              <BrainCircuit size={32} className="mb-2 opacity-20" />
              <p className="text-sm">Chưa có dữ liệu phân tích.<br/>Hãy chạy AI để dự đoán rủi ro.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <History size={20} className="text-slate-500" />
          Lịch sử bảo trì
        </h3>
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 p-3 border-b border-slate-50 last:border-0">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                log.status === "normal" ? "bg-green-50 text-green-600" : log.status === "warning" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
              )}>
                <Activity size={16} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">{log.status === "normal" ? "Bình thường" : log.status === "warning" ? "Cảnh báo" : "Hư hỏng"}</p>
                  <span className="text-xs text-slate-400">{log.timestamp?.toDate().toLocaleString("vi-VN")}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{log.note || "Không có ghi chú"}</p>
              </div>
            </div>
          ))}
          {logs.length === 0 && <p className="text-center text-slate-400 py-8">Chưa có lịch sử</p>}
        </div>
      </div>
    </div>
  );
};

export default DeviceDetails;
