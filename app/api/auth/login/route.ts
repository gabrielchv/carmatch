import { NextResponse } from "next/server";
import { addItem, readData } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { generateId, nowISO } from "@/lib/utils";
import type { User } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { name, email } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const users = readData<User>("users");
    let user = users.find((u) => u.email === email);

    if (!user) {
      user = {
        id: generateId(),
        name,
        email,
        provider: "email",
        createdAt: nowISO(),
      };
      addItem("users", user);
    }

    await createSession(user);

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
