import React, { useState } from "react";
import { useAuth } from "../App";
import { Navigate } from "react-router-dom";
import { Activity, Mail, Lock, Loader2, AlertCircle } from "lucide-react";

const LoginPage = () => {
  const { login, loginWithEmail, profile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (profile) return <Navigate to="/dashboard" />;

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      console.error(err);
      setError("Email hoặc mật khẩu không đúng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-8 text-center bg-slate-50 border-b border-slate-100">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <Activity className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">MedTrack Liên Chiểu</h1>
          <p className="text-slate-500 mt-2">Hệ thống quản lý thiết bị y tế thông minh</p>
        </div>
        
        <div className="p-8 space-y-6">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hospital.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Đăng nhập"}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-medium">Hoặc</span>
            </div>
          </div>

          <button 
            onClick={login}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-medium text-slate-700"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
            Tiếp tục với Google
          </button>

          <p className="text-center text-xs text-slate-400">
            Bằng cách đăng nhập, bạn đồng ý với các điều khoản sử dụng của hệ thống.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
