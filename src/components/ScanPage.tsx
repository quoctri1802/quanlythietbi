import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";
import { QrCode, ScanLine } from "lucide-react";
import { cn } from "../lib/utils";

const ScanPage = () => {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (scanning) {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render((decodedText) => {
        let deviceId = "";
        if (decodedText.includes("/device/")) {
          deviceId = decodedText.split("/device/")[1];
        } else if (decodedText.length > 10) { // Assume it's a raw Firestore ID
          deviceId = decodedText;
        }

        if (deviceId) {
          scanner?.clear();
          navigate(`/device/${deviceId}?scan=true`);
        }
      }, (error) => {
        // console.warn(error);
      });
    }
    return () => {
      if (scanner) scanner.clear();
    };
  }, [scanning, navigate]);

  return (
    <div className="max-w-md mx-auto space-y-6 text-center">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <QrCode size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Quét mã QR</h2>
        <p className="text-slate-500 mt-2">Đưa camera vào mã QR dán trên thiết bị để cập nhật trạng thái.</p>
        
        <div id="reader" className={cn(
          "mt-8 aspect-square bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative",
          !scanning && "hidden"
        )}>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent animate-scan" />
        </div>

        {!scanning && (
          <div className="mt-8 aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center">
            <ScanLine size={48} className="text-slate-300" />
          </div>
        )}

        <button 
          onClick={() => setScanning(!scanning)}
          className={cn(
            "w-full mt-8 py-3 rounded-xl font-bold transition-all shadow-lg",
            scanning ? "bg-red-100 text-red-600 hover:bg-red-200 shadow-red-100" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
          )}
        >
          {scanning ? "Dừng quét" : "Bắt đầu quét"}
        </button>
      </div>
    </div>
  );
};

export default ScanPage;
