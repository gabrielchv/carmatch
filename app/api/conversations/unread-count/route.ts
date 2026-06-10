import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getConversationCount } from "@/lib/chat";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ count: 0 });
  }

  const count = getConversationCount(user.id);
  return NextResponse.json({ count });
}
