import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { getSession, setSession, clearSession } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DATA_TABLES = [
  "finance_accounts",
  "finance_debts",
  "finance_family_debts",
  "finance_crypto_holdings",
  "finance_incomings",
  "finance_budget_line_items",
  "finance_annual_subscriptions",
  "finance_pet_expenses",
  "finance_family_owed",
];

async function ensureAdminExists(): Promise<string | null> {
  const envUser = process.env.AUTH_USERNAME;
  const envPass = process.env.AUTH_PASSWORD;
  if (!envUser || !envPass) return null;

  // Check if any users exist
  const { count } = await supabase
    .from("finance_users")
    .select("id", { count: "exact", head: true });

  if (count && count > 0) return null; // users already exist

  // Create admin user from env vars
  const hash = await bcrypt.hash(envPass, 10);
  const { data, error } = await supabase
    .from("finance_users")
    .insert({ username: envUser, password_hash: hash, is_admin: true })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to create admin user:", error?.message);
    return null;
  }

  // Backfill all existing data rows with this admin's user_id
  await Promise.all(
    DATA_TABLES.map((table) =>
      supabase.from(table).update({ user_id: data.id }).is("user_id", null)
    )
  );

  return data.id;
}

export async function POST(req: Request) {
  const { username, password } = (await req.json()) as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    return Response.json({ error: "Missing credentials" }, { status: 400 });
  }

  // On first login, auto-create admin from env vars
  await ensureAdminExists();

  // Look up user by username
  const { data: user, error } = await supabase
    .from("finance_users")
    .select("id, username, password_hash, is_admin")
    .eq("username", username)
    .single();

  if (error || !user) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await setSession(user.id);
  return Response.json({
    ok: true,
    userId: user.id,
    username: user.username,
    isAdmin: user.is_admin,
  });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ authenticated: false });
  }
  return Response.json({
    authenticated: true,
    userId: session.id,
    username: session.username,
    isAdmin: session.isAdmin,
  });
}

export async function DELETE() {
  await clearSession();
  return Response.json({ ok: true });
}
