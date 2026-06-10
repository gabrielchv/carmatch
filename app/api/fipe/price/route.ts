import { NextResponse } from "next/server";

const FIPE_BASE = "https://parallelum.com.br/fipe/api/v1/carros";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");
  const modelId = searchParams.get("modelId");
  const yearCode = searchParams.get("yearCode");

  if (!brandId || !modelId || !yearCode) {
    return NextResponse.json(
      { error: "Parâmetros brandId, modelId e yearCode são obrigatórios" },
      { status: 400 }
    );
  }

  const res = await fetch(
    `${FIPE_BASE}/marcas/${brandId}/modelos/${modelId}/anos/${yearCode}`,
    { next: { revalidate: 86400 } }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Erro ao buscar preço na Tabela FIPE" },
      { status: 502 }
    );
  }

  const data: {
    Valor: string;
    Marca: string;
    Modelo: string;
    AnoModelo: number;
    Combustivel: string;
    CodigoFipe: string;
    MesReferencia: string;
    SiglaCombustivel: string;
  } = await res.json();

  return NextResponse.json(data);
}
