import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

function getAdminAuth(): Auth {
  if (!getApps().length) {
    const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!key) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY env var is not set");
    }
    const serviceAccount = JSON.parse(key) as ServiceAccount;
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getAuth();
}

export const adminAuth = new Proxy({} as Auth, {
  get(_, prop) {
    const auth = getAdminAuth();
    const value = auth[prop as keyof Auth];
    return typeof value === "function" ? value.bind(auth) : value;
  },
});
