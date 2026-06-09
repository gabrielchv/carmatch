import { NextResponse } from "next/server";
import { addItem, readData } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateId, nowISO } from "@/lib/utils";
import { runMatching } from "@/lib/matching";
import type { CarPost } from "@/lib/types";
import fs from "node:fs";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const brand = searchParams.get("brand");
  const model = searchParams.get("model");

  let posts = readData<CarPost>("posts").filter((p) => p.isActive);

  if (brand) {
    posts = posts.filter(
      (p) => p.car.brand.toLowerCase() === brand.toLowerCase()
    );
  }
  if (model) {
    posts = posts.filter(
      (p) => p.car.model.toLowerCase() === model.toLowerCase()
    );
  }
  if (minPrice) {
    posts = posts.filter(
      (p) => p.car.estimatedValue >= Number(minPrice)
    );
  }
  if (maxPrice) {
    posts = posts.filter(
      (p) => p.car.estimatedValue <= Number(maxPrice)
    );
  }

  posts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const formData = await request.formData();

    // Extract text fields
    const title = formData.get("title") as string;
    const description = (formData.get("description") as string) || "";
    const brand = formData.get("brand") as string;
    const model = formData.get("model") as string;
    const year = Number(formData.get("year"));
    const estimatedValue = Number(formData.get("estimatedValue"));
    const desiredBrand = (formData.get("desiredBrand") as string) || undefined;
    const desiredModel = (formData.get("desiredModel") as string) || undefined;
    const desiredYearMin = formData.get("desiredYearMin")
      ? Number(formData.get("desiredYearMin"))
      : undefined;
    const desiredYearMax = formData.get("desiredYearMax")
      ? Number(formData.get("desiredYearMax"))
      : undefined;
    const cashAdjustment = Number(formData.get("cashAdjustment")) || 0;
    const cashAdjustmentTolerance =
      Number(formData.get("cashAdjustmentTolerance")) || 0;
    const whatsapp = (formData.get("whatsapp") as string) || undefined;
    const email = (formData.get("email") as string) || undefined;

    // Handle image uploads
    const imageFiles = formData.getAll("images") as File[];
    const savedImages: string[] = [];

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    for (const file of imageFiles) {
      if (file.size > 0) {
        const ext = path.extname(file.name) || ".jpg";
        const filename = `${generateId()}${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
        savedImages.push(filename);
      }
    }

    const post: CarPost = {
      id: generateId(),
      userId: user.id,
      title,
      description,
      car: { brand, model, year, estimatedValue },
      desiredTrade: {
        brand: desiredBrand,
        model: desiredModel,
        yearMin: desiredYearMin,
        yearMax: desiredYearMax,
        cashAdjustment,
        cashAdjustmentTolerance,
      },
      contactInfo: { whatsapp, email },
      images: savedImages,
      createdAt: nowISO(),
      isActive: true,
    };

    addItem("posts", post);

    // Run matching algorithm against all posts
    runMatching();

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}
