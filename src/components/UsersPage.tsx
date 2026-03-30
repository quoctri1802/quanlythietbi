import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth, UserProfile, UserRole } from "../App";
import { Users as UsersIcon, Plus, Shield, UserCheck, UserX, Search, Filter, Mail, X, Edit } from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

const UsersPage = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    email: "",
    displayName: "",
    role: "staff" as UserRole,
    tenantId: profile?.tenantId || "",
    active: true
  });

  // Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    
    // Admins can see all users in their tenant
    const q = query(collection(db, "users"), where("tenantId", "==", profile.tenantId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ uid: d.id, ...d.data() }) as UserProfile));
      setLoading(false);
    });
    
    return unsubscribe;
  }, [profile]);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      if (editingUser) {
        // Update existing user
        await updateDoc(doc(db, "users", editingUser.uid), {
          displayName: formData.displayName,
          role: formData.role,
          active: formData.active,
          updatedAt: serverTimestamp()
        });
      } else {
        // Add new user (Note: In a real app, this would likely be handled via Firebase Admin SDK 
        // or an invitation system since we can't create Auth users from client-side easily 
        // without their password. For this SaaS demo, we'll create a placeholder profile 
        // that will be "claimed" when the user logs in with that email.)
        
        // Check if user already exists
        const userQuery = query(
          collection(db, "users"), 
          where("email", "==", formData.email),
          where("tenantId", "==", profile.tenantId)
        );
        const existingUsers = await getDocs(userQuery);
        
        if (!existingUsers.empty) {
          alert("Người dùng với email này đã tồn tại.");
          return;
        }

        // Create a unique ID for the placeholder user (using email as ID is safer for lookup)
        const docId = formData.email.toLowerCase();
        await setDoc(doc(db, "users", docId), {
          uid: docId,
          email: formData.email,
          displayName: formData.displayName,
          role: formData.role,
          tenantId: profile.tenantId,
          active: true,
          createdAt: serverTimestamp(),
          isPlaceholder: true
        });
      }
      
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving user:", error);
      alert("Có lỗi xảy ra khi lưu người dùng.");
    }
  };

  const toggleUserStatus = async (user: UserProfile) => {
    try {
      await updateDoc(doc(db, "users", user.uid), {
        active: !(user as any).active
      });
    } catch (error) {
      console.error("Error toggling user status:", error);
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      email: "",
      displayName: "",
      role: "staff",
      tenantId: profile?.tenantId || "",
      active: true
    });
  };

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      tenantId: user.tenantId,
      active: (user as any).active !== false
    });
    setIsModalOpen(true);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  if (profile?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Shield size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900">Truy cập bị từ chối</h2>
        <p className="text-slate-500 mt-2">Bạn không có quyền truy cập vào trang quản lý người dùng.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Quản lý người dùng</h2>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-md"
        >
          <Plus size={18} />
          Thêm người dùng
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo tên hoặc email..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 shadow-sm appearance-none cursor-pointer"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="staff">Nhân viên (Staff)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Người dùng</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vai trò</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : (
                <>
                  {filteredUsers.map((u) => (
                    <tr key={u.uid} className={cn("hover:bg-slate-50 transition-colors", (u as any).active === false && "opacity-60")}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}&background=random`} className="w-10 h-10 rounded-full border border-slate-100" />
                          <div>
                            <p className="font-medium text-slate-900">{u.displayName}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
                          u.role === "admin" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                        )}>
                          {u.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
                          (u as any).active !== false ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-800"
                        )}>
                          {(u as any).active !== false ? "Đang hoạt động" : "Đã vô hiệu hóa"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openEditModal(u)}
                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => toggleUserStatus(u)}
                            className={cn(
                              "p-2 transition-colors",
                              (u as any).active !== false ? "text-slate-400 hover:text-red-600" : "text-slate-400 hover:text-green-600"
                            )}
                            title={(u as any).active !== false ? "Vô hiệu hóa" : "Kích hoạt"}
                          >
                            {(u as any).active !== false ? <UserX size={18} /> : <UserCheck size={18} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">Không tìm thấy người dùng nào</td>
                    </tr>
                  )}
                </>
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
                <h3 className="text-xl font-bold text-slate-900">
                  {editingUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      required
                      disabled={!!editingUser}
                      type="email" 
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tên hiển thị</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                    value={formData.displayName}
                    onChange={e => setFormData({...formData, displayName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vai trò</label>
                  <select 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                  >
                    <option value="staff">Nhân viên (Staff)</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>
                
                {editingUser && (
                  <div className="flex items-center gap-2 pt-2">
                    <input 
                      type="checkbox" 
                      id="active"
                      checked={formData.active}
                      onChange={e => setFormData({...formData, active: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <label htmlFor="active" className="text-sm font-medium text-slate-700">Tài khoản đang hoạt động</label>
                  </div>
                )}

                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all mt-4">
                  {editingUser ? "Cập nhật" : "Tạo người dùng"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UsersPage;
