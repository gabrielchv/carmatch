import { NextResponse } from "next/server";
import { addItem, readData } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateId, nowISO } from "@/lib/utils";
import { runMatching } from "@/lib/matching";
import type { CarPost, DesiredVehicle } from "@/lib/types";
import fs from "node:fs";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase();
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");

  let posts = readData<CarPost>("posts").filter((p) => p.isActive);

  // Busca geral: procura em título, descrição, marca e modelo
  if (q) {
    posts = posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.car.brand.toLowerCase().includes(q) ||
        p.car.model.toLowerCase().includes(q)
    );
  }

  if (minPrice) {
    posts = posts.filter((p) => p.car.estimatedValue >= Number(minPrice));
  }
  if (maxPrice) {
    posts = posts.filter((p) => p.car.estimatedValue <= Number(maxPrice));
  }

  posts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
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

    // Monta array de vehicles a partir dos fields do form
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

    // Salva imagens
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
      car: { brand, model, year, estimatedValue, fipeBrandId, fipeModelCode, fipeYearCode },
      desiredTrade: { vehicles },
      contactInfo: { whatsapp, email },
      images: savedImages,
      createdAt: nowISO(),
      isActive: true,
    };

    addItem("posts", post);

    // Roda matching automaticamente
    const newMatches = runMatching();

    return NextResponse.json({ post, newMatches: newMatches.length }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar post:", error);
    return NextResponse.json(
      { error: "Erro ao criar anúncio" },
      { status: 500 }
    );
  }
}
