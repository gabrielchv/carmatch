import { NextResponse } from "next/server";

const FIPE_BASE = "https://parallelum.com.br/fipe/api/v1/carros";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");
  const modelId = searchParams.get("modelId");

  if (!brandId || !modelId) {
    return NextResponse.json(
      { error: "Parâmetros brandId e modelId são obrigatórios" },
      { status: 400 }
    );
  }

  const res = await fetch(
    `${FIPE_BASE}/marcas/${brandId}/modelos/${modelId}/anos`,
    { next: { revalidate: 86400 } }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Erro ao buscar anos da Tabela FIPE" },
      { status: 502 }
    );
  }

  const data: { codigo: string; nome: string }[] = await res.json();
  return NextResponse.json(data);
}
