import React from "react";
import { useAuth } from "../App";
import { Navigate } from "react-router-dom";
import { Activity } from "lucide-react";

const LoginPage = () => {
  const { login, profile } = useAuth();
  if (profile) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8 text-center bg-slate-50 border-b border-slate-100">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <Activity className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">MedTrack Liên Chiểu</h1>
          <p className="text-slate-500 mt-2">Hệ thống quản lý thiết bị y tế thông minh</p>
        </div>
        <div className="p-8">
          <button 
            onClick={login}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-medium text-slate-700"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
            Đăng nhập với Google
          </button>
          <p className="text-center text-xs text-slate-400 mt-6">
            Bằng cách đăng nhập, bạn đồng ý với các điều khoản sử dụng của hệ thống.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
