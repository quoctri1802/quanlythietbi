import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, query, collection, where, getDocs, deleteDoc } from "firebase/firestore";
import { auth, db, signInWithGoogle, signOut, loginWithEmail as firebaseLoginWithEmail } from "./firebase";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Activity } from "lucide-react";

// --- Components ---
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import DevicesPage from "./components/DevicesPage";
import DeviceDetails from "./components/DeviceDetails";
import ScanPage from "./components/ScanPage";
import LogsPage from "./components/LogsPage";
import LoginPage from "./components/LoginPage";
import UsersPage from "./components/UsersPage";

// --- Types ---
export type UserRole = "admin" | "staff";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  tenantId: string;
  photoURL?: string;
  active?: boolean;
}

export interface Device {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  department: string;
  tenantId: string;
  status: "normal" | "warning" | "broken";
  lastUpdate: any;
}

export interface Log {
  id: string;
  deviceId: string;
  tenantId: string;
  userId: string;
  status: "normal" | "warning" | "broken";
  note: string;
  timestamp: any;
}

export interface AIReport {
  id: string;
  deviceId: string;
  tenantId: string;
  riskPercentage: number;
  prediction: string;
  timestamp: any;
}

// --- Auth Context ---
interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // 1. Try to find by UID
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        
        if (userDoc.exists()) {
          const profileData = userDoc.data() as UserProfile;
          if (profileData.active === false) {
            await signOut();
            setUser(null);
            setProfile(null);
            alert("Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.");
          } else {
            setProfile(profileData);
          }
        } else {
          // 2. If not found by UID, check if there's a pre-created profile by email
          const q = query(collection(db, "users"), where("email", "==", firebaseUser.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            // Claim the pre-created profile
            const placeholderDoc = querySnapshot.docs[0];
            const placeholderData = placeholderDoc.data();
            
            const newProfile: UserProfile = {
              ...placeholderData as UserProfile,
              uid: firebaseUser.uid,
              photoURL: firebaseUser.photoURL || undefined,
              active: true,
            };

            // Create new doc with UID
            await setDoc(doc(db, "users", firebaseUser.uid), {
              ...newProfile,
              updatedAt: serverTimestamp(),
            });

            // Delete the placeholder doc if it was a temp one
            if (placeholderDoc.id !== firebaseUser.uid) {
              await deleteDoc(placeholderDoc.ref);
            }

            setProfile(newProfile);
          } else {
            // 3. Create a completely new profile if nothing exists
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || "User",
              role: firebaseUser.email === "quoctri1802@gmail.com" ? "admin" : "staff",
              tenantId: "lien-chieu-medical-center",
              photoURL: firebaseUser.photoURL || undefined,
              active: true,
            };
            await setDoc(doc(db, "users", firebaseUser.uid), {
              ...newProfile,
              createdAt: serverTimestamp(),
            });
            setProfile(newProfile);
          }
          
          // Ensure tenant exists
          await setDoc(doc(db, "tenants", "lien-chieu-medical-center"), {
            name: "Trung tâm Y tế Khu vực Liên Chiểu",
            address: "Liên Chiểu, Đà Nẵng",
            createdAt: serverTimestamp(),
          }, { merge: true });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    await signInWithGoogle();
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await firebaseLoginWithEmail(email, pass);
  };

  const logout = async () => {
    await signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, loginWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

// --- Main App ---

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/devices" element={
            <ProtectedRoute>
              <Layout><DevicesPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/device/:id" element={
            <ProtectedRoute>
              <Layout><DeviceDetails /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/scan" element={
            <ProtectedRoute>
              <Layout><ScanPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/logs" element={
            <ProtectedRoute>
              <Layout><LogsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute>
              <Layout><UsersPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
