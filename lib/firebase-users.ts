import { adminAuth } from "./firebase-admin";

export interface FirebaseUserInfo {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export async function resolveFirebaseUsers(
  uids: string[]
): Promise<Map<string, FirebaseUserInfo>> {
  if (uids.length === 0) return new Map();

  const result = await adminAuth.getUsers(
    uids.map((uid) => ({ uid }))
  );

  const map = new Map<string, FirebaseUserInfo>();
  for (const user of result.users) {
    map.set(user.uid, {
      uid: user.uid,
      displayName: user.displayName ?? null,
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
    });
  }

  return map;
}
