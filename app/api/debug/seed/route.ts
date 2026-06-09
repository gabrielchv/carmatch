import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed-data";

export async function POST() {
  const result = seedDatabase();
  return NextResponse.json({
    success: true,
    users: result.users.length,
    posts: result.posts.length,
    matches: result.matchCount,
  });
}
