"use client";

import { useState, useEffect, type ReactNode } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { AuthProvider } from "@/contexts/AuthContext";
import { FinanceProvider } from "@/contexts/FinanceContext";
import { SharedProvider } from "@/contexts/SharedContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import Shell from "./Shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Fade } from "@/components/animate-ui/primitives/effects/fade";
import { Skeleton } from "@/components/ui/skeleton";

interface UserInfo {
  userId: string;
  username: string;
  isAdmin: boolean;
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "locked" | "unlocked">(
    "loading"
  );
  const [user, setUser] = useState<UserInfo | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) {
          setUser({
            userId: d.userId,
            username: d.username,
            isAdmin: d.isAdmin,
          });
          setStatus("unlocked");
        } else {
          setStatus("locked");
        }
      })
      .catch(() => setStatus("locked"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      const idToken = await cred.user.getIdToken();

      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (res.ok) {
        const d = await res.json();
        setUser({
          userId: d.userId,
          username: d.username,
          isAdmin: d.isAdmin,
        });
        setStatus("unlocked");
      } else {
        const d = await res.json();
        setError(d.error || "User not found in system");
        setPassword("");
      }
    } catch {
      setError("Invalid credentials");
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  if (status === "unlocked" && user) {
    return (
      <AuthProvider user={user}>
        <FinanceProvider userId={user.userId}>
          <SharedProvider userId={user.userId}>
            <CurrencyProvider>
              <Shell>{children}</Shell>
            </CurrencyProvider>
          </SharedProvider>
        </FinanceProvider>
      </AuthProvider>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <Fade className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-sm font-bold tracking-tight">
              finance.
            </CardTitle>
            <CardDescription>
              Sign in to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}

              {resetSent && (
                <p className="text-xs text-positive">Password reset email sent</p>
              )}

              <Button
                type="submit"
                disabled={submitting || !email || !password}
                className="w-full"
              >
                {submitting ? "Signing in..." : "Sign in"}
              </Button>

              <button
                type="button"
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={async () => {
                  if (!email) {
                    setError("Enter your email first");
                    return;
                  }
                  setError("");
                  setResetSent(false);
                  try {
                    await sendPasswordResetEmail(getFirebaseAuth(), email);
                    setResetSent(true);
                  } catch {
                    setError("Failed to send reset email");
                  }
                }}
              >
                Forgot password?
              </button>
            </form>
          </CardContent>
        </Card>
      </Fade>
    </div>
  );
}
