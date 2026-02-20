import { cookies } from "next/headers";

const SESSION_COOKIE = "finance-auth";
const SESSION_VALUE = "authenticated";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(req: Request) {
  const { username, password } = (await req.json()) as {
    username?: string;
    password?: string;
  };

  const validUser = process.env.AUTH_USERNAME;
  const validPass = process.env.AUTH_PASSWORD;

  if (!validUser || !validPass) {
    return Response.json({ error: "Auth not configured" }, { status: 500 });
  }

  if (username === validUser && password === validPass) {
    const jar = await cookies();
    jar.set(SESSION_COOKIE, SESSION_VALUE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: MAX_AGE,
      path: "/",
    });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Invalid credentials" }, { status: 401 });
}

export async function GET() {
  const jar = await cookies();
  const session = jar.get(SESSION_COOKIE);
  const authenticated = session?.value === SESSION_VALUE;
  return Response.json({ authenticated });
}
