import { NextResponse } from "next/server";
import { getItemById, deleteItem, readData, writeData } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { runMatching } from "@/lib/matching";
import type { CarPost, Match } from "@/lib/types";
import fs from "node:fs";
import path from "node:path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const post = getItemById<CarPost>("posts", id);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  return NextResponse.json({ post });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const post = getItemById<CarPost>("posts", id);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete associated images
  for (const image of post.images) {
    const fp = path.join(process.cwd(), "public", "uploads", image);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  // Delete post
  deleteItem<CarPost>("posts", id);

  // Remove related matches
  const matches = readData<Match>("matches").filter(
    (m) => m.postAId !== id && m.postBId !== id
  );
  writeData("matches", matches);

  // Re-run matching for remaining posts
  runMatching();

  return NextResponse.json({ success: true });
}
