import { NextResponse } from "next/server";
import { clearData } from "@/lib/db";

export async function POST() {
  clearData("users");
  clearData("posts");
  clearData("matches");
  return NextResponse.json({ success: true });
}
