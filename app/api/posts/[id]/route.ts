import { NextResponse } from "next/server";
import { getItemById, deleteItem, readData, writeData } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { runMatching } from "@/lib/matching";
import type { CarPost, Match, DesiredVehicle } from "@/lib/types";
import fs from "node:fs";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const post = getItemById<CarPost>("posts", id);
  if (!post) {
    return NextResponse.json({ error: "Anúncio não encontrado" }, { status: 404 });
  }
  if (post.userId !== user.id) {
    return NextResponse.json({ error: "Proibido" }, { status: 403 });
  }

  try {
    const formData = await request.formData();

    const title = formData.get("title") as string;
    const description = (formData.get("description") as string) || "";
    const brand = formData.get("brand") as string;
    const model = formData.get("model") as string;
    const year = Number(formData.get("year"));
    const estimatedValue = Number(formData.get("estimatedValue"));
    const fipeBrandId = (formData.get("fipeBrandId") as string) || undefined;
    const fipeModelCode = (formData.get("fipeModelCode") as string) || undefined;
    const fipeYearCode = (formData.get("fipeYearCode") as string) || undefined;
    const whatsapp = (formData.get("whatsapp") as string) || undefined;
    const email = (formData.get("email") as string) || undefined;

    // Vehicle rows
    const vehicleVehicleTypes = formData.getAll("vVehicleType") as string[];
    const vehicleBrands = formData.getAll("vBrand") as string[];
    const vehicleModels = formData.getAll("vModel") as string[];
    const vehicleVersions = formData.getAll("vVersion") as string[];
    const vehicleTransmissions = formData.getAll("vTransmission") as string[];
    const vehicleYearMin = formData.getAll("vYearMin") as string[];
    const vehicleYearMax = formData.getAll("vYearMax") as string[];
    const vehicleCashAdj = formData.getAll("vCashAdj") as string[];
    const vehicleTolerance = formData.getAll("vTolerance") as string[];
    const vehicleFipeBrandId = formData.getAll("vFipeBrandId") as string[];
    const vehicleFipeVersionCode = formData.getAll("vFipeVersionCode") as string[];

    const vehicles: DesiredVehicle[] = [];
    for (let i = 0; i < vehicleBrands.length; i++) {
      const vt = vehicleVehicleTypes[i]?.trim();
      const vb = vehicleBrands[i]?.trim();

      // Vehicle type mode
      if (vt) {
        vehicles.push({
          brand: "",
          model: "",
          cashAdjustment: Number(vehicleCashAdj[i]) || 0,
          cashAdjustmentTolerance: Number(vehicleTolerance[i]) || 0,
          yearMin: vehicleYearMin[i] ? Number(vehicleYearMin[i]) : undefined,
          yearMax: vehicleYearMax[i] ? Number(vehicleYearMax[i]) : undefined,
          vehicleType: vt as DesiredVehicle["vehicleType"],
        });
        continue;
      }

      // Specific vehicle mode: skip rows without brand
      if (!vb) continue;
      vehicles.push({
        brand: vb,
        model: vehicleModels[i]?.trim() || "",
        version: vehicleVersions[i]?.trim() || undefined,
        transmission: vehicleTransmissions[i]?.trim() || undefined,
        yearMin: vehicleYearMin[i] ? Number(vehicleYearMin[i]) : undefined,
        yearMax: vehicleYearMax[i] ? Number(vehicleYearMax[i]) : undefined,
        cashAdjustment: Number(vehicleCashAdj[i]) || 0,
        cashAdjustmentTolerance: Number(vehicleTolerance[i]) || 0,
        fipeBrandId: vehicleFipeBrandId[i]?.trim() || undefined,
        fipeVersionCode: vehicleFipeVersionCode[i]?.trim() || undefined,
      });
    }

    // ── Handle images ──
    const keepImagesRaw = formData.get("keepImages") as string | null;
    const keepImages: string[] = keepImagesRaw
      ? (() => { try { return JSON.parse(keepImagesRaw); } catch { return []; } })()
      : post.images; // if not sent, keep all existing

    // Delete images no longer referenced
    for (const img of post.images) {
      if (!keepImages.includes(img)) {
        const fp = path.join(UPLOAD_DIR, img);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
    }

    // Save new uploaded images
    const imageFiles = formData.getAll("images") as File[];
    const newImages: string[] = [];

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    for (const file of imageFiles) {
      if (file.size > 0) {
        const ext = path.extname(file.name) || ".jpg";
        const filename = `${crypto.randomUUID()}${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
        newImages.push(filename);
      }
    }

    // ── Build updated post ──
    const updated: CarPost = {
      ...post,
      title,
      description,
      car: { brand, model, year, estimatedValue, fipeBrandId, fipeModelCode, fipeYearCode },
      desiredTrade: { vehicles },
      contactInfo: { whatsapp, email },
      images: [...keepImages, ...newImages],
    };

    // Write update
    const allPosts = readData<CarPost>("posts");
    const idx = allPosts.findIndex((p) => p.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Anúncio não encontrado" }, { status: 404 });
    }
    allPosts[idx] = updated;
    writeData("posts", allPosts);

    // Re-run matching
    runMatching();

    return NextResponse.json({ post: updated });
  } catch (error) {
    console.error("Erro ao atualizar anúncio:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar anúncio" },
      { status: 500 }
    );
  }
}
