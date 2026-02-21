import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const SESSION_COOKIE = "finance-auth";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface SessionUser {
  id: string;
  username: string;
  isAdmin: boolean;
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const cookie = jar.get(SESSION_COOKIE);
  if (!cookie?.value?.startsWith("user:")) return null;

  const userId = cookie.value.slice(5); // strip "user:" prefix
  const { data, error } = await supabase
    .from("finance_users")
    .select("id, username, is_admin")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return { id: data.id, username: data.username, isAdmin: data.is_admin };
}

export async function setSession(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, `user:${userId}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
