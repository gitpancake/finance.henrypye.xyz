import { getSession, setSession, clearSession } from "@/lib/auth";
import { adminAuth } from "@/lib/firebase-admin";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const { idToken } = (await req.json()) as { idToken?: string };

  if (!idToken) {
    return Response.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const userRecord = await adminAuth.getUser(decoded.uid);

    const { data: user, error } = await supabase
      .from("finance_users")
      .select("id, is_admin")
      .eq("firebase_uid", decoded.uid)
      .single();

    if (error || !user) {
      return Response.json({ error: "User not found" }, { status: 401 });
    }

    await setSession(idToken);
    return Response.json({
      ok: true,
      userId: user.id,
      uid: decoded.uid,
      email: userRecord.email ?? "",
      displayName: userRecord.displayName ?? null,
      photoURL: userRecord.photoURL ?? null,
      isAdmin: user.is_admin,
    });
  } catch {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ authenticated: false });
  }
  return Response.json({
    authenticated: true,
    userId: session.id,
    uid: session.uid,
    email: session.email,
    displayName: session.displayName,
    photoURL: session.photoURL,
    isAdmin: session.isAdmin,
  });
}

export async function DELETE() {
  await clearSession();
  return Response.json({ ok: true });
}
