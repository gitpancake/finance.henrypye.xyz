"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

export interface AuthUser {
  userId: string;
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  isAdmin: boolean;
}

interface AuthContextValue {
  user: AuthUser;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  user: initialUser,
  children,
}: {
  user: AuthUser;
  children: ReactNode;
}) {
  const [user, setUser] = useState<AuthUser>(initialUser);

  const refreshUser = useCallback(async () => {
    const res = await fetch("/api/auth");
    const data = await res.json();
    if (data.authenticated) {
      setUser({
        userId: data.userId,
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        isAdmin: data.isAdmin,
      });
    }
  }, []);

  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    await signOut(getFirebaseAuth());
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ user, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
