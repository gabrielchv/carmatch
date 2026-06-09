import { NextResponse } from "next/server";
import { readData, getItemById } from "@/lib/db";
import type { CarPost, Match } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const post = getItemById<CarPost>("posts", id);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const allMatches = readData<Match>("matches");
  const postMatches = allMatches.filter(
    (m) => m.postAId === id || m.postBId === id
  );

  const matchesWithPosts = postMatches.map((m) => {
    const otherPostId = m.postAId === id ? m.postBId : m.postAId;
    const otherPost = getItemById<CarPost>("posts", otherPostId);
    return {
      match: m,
      otherPost: otherPost || null,
    };
  });

  matchesWithPosts.sort((a, b) => b.match.score - a.match.score);

  return NextResponse.json({ matches: matchesWithPosts });
}
