import { NextResponse } from "next/server";

const FIPE_BASE = "https://parallelum.com.br/fipe/api/v1/carros";

// Cache em memória (recria a cada deploy/restart)
let cache: { data: { codigo: string; nome: string }[] } | null = null;

export async function GET() {
  if (cache) {
    return NextResponse.json(cache.data);
  }

  const res = await fetch(`${FIPE_BASE}/marcas`, {
    next: { revalidate: 86400 }, // revalida a cada 24h no fetch cache do Next
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Erro ao buscar marcas da Tabela FIPE" },
      { status: 502 }
    );
  }

  const data: { codigo: string; nome: string }[] = await res.json();
  // Ordena por nome
  data.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  cache = { data };

  return NextResponse.json(data);
}
