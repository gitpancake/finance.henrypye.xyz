"use client";

import { createContext, useContext, type ReactNode } from "react";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

interface AuthUser {
  userId: string;
  username: string;
  isAdmin: boolean;
}

interface AuthContextValue {
  user: AuthUser;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  user,
  children,
}: {
  user: AuthUser;
  children: ReactNode;
}) {
  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    await signOut(getFirebaseAuth());
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
