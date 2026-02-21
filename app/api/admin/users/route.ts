import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function requireAdmin() {
  const session = await getSession();
  if (!session?.isAdmin) return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("finance_users")
    .select("id, username, is_admin, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { username, password } = (await req.json()) as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    return Response.json({ error: "Username and password required" }, { status: 400 });
  }

  if (password.length < 6) {
    return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  // Check if username already exists
  const { data: existing } = await supabase
    .from("finance_users")
    .select("id")
    .eq("username", username)
    .single();

  if (existing) {
    return Response.json({ error: "Username already exists" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from("finance_users")
    .insert({ username, password_hash: hash, is_admin: false })
    .select("id, username, is_admin, created_at")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = (await req.json()) as { userId?: string };
  if (!userId) {
    return Response.json({ error: "userId required" }, { status: 400 });
  }

  // Prevent admin from deleting themselves
  if (userId === admin.id) {
    return Response.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  const { error } = await supabase
    .from("finance_users")
    .delete()
    .eq("id", userId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
