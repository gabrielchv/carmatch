import { NextResponse } from "next/server";

const FIPE_BASE = "https://parallelum.com.br/fipe/api/v1/carros";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");

  if (!brandId) {
    return NextResponse.json(
      { error: "Parâmetro brandId é obrigatório" },
      { status: 400 }
    );
  }

  const res = await fetch(
    `${FIPE_BASE}/marcas/${brandId}/modelos`,
    { next: { revalidate: 86400 } }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Erro ao buscar modelos da Tabela FIPE" },
      { status: 502 }
    );
  }

  const data: { modelos: { codigo: number; nome: string }[] } =
    await res.json();

  // Ordena por nome
  data.modelos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return NextResponse.json(data.modelos);
}
