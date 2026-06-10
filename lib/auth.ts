import { cookies } from "next/headers";
import type { User } from "./types";
import { getItemById } from "./db";

const SESSION_COOKIE = "carmatch-session";

interface SessionData {
  userId: string;
  name: string;
}

export async function createSession(user: User): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    JSON.stringify({ userId: user.id, name: user.name }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    }
  );
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionData(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (!cookie) return null;
  try {
    return JSON.parse(cookie.value) as SessionData;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSessionData();
  if (!session) return null;
  return getItemById<User>("users", session.userId) ?? null;
}
