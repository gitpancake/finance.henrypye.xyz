import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth";
import { resolveFirebaseUsers } from "@/lib/firebase-users";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("finance_users")
    .select("id, username, firebase_uid")
    .order("username", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).filter(
    (u: { id: string }) => u.id !== session.id
  );

  // Resolve Firebase profile data for all users
  const uids = rows
    .map((u: { firebase_uid: string }) => u.firebase_uid)
    .filter(Boolean);
  const firebaseUsers = await resolveFirebaseUsers(uids);

  const users = rows.map((u: { id: string; username: string; firebase_uid: string }) => {
    const fb = firebaseUsers.get(u.firebase_uid);
    return {
      id: u.id,
      username: u.username,
      displayName: fb?.displayName ?? null,
      photoURL: fb?.photoURL ?? null,
      email: fb?.email ?? null,
    };
  });

  return Response.json(users);
}
