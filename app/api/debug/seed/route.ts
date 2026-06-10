import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed-data";

export async function POST() {
  try {
    const result = await seedDatabase();
    return NextResponse.json({
      success: true,
      users: result.users.length,
      posts: result.posts.length,
      matches: result.matchCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { success: false, error: message },
      { status: 502 }
    );
  }
}
