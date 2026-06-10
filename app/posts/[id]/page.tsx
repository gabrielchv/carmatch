"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CarPost, User, DesiredVehicle } from "@/lib/types";

interface MatchResult {
  match: {
    id: string;
    score: number;
    suggestedCashFromA: number;
    status: string;
  };
  otherPost: CarPost | null;
}

/** Mostra de forma clara: "Você paga R$ X" ou "Você recebe R$ X" */
function cashPill(adj: number, tol: number): string {
  if (adj === 0 && tol === 0) return "Troca direta, sem grana";
  const base =
    adj > 0
      ? `Você paga R$ ${adj.toLocaleString("pt-BR")}`
      : adj < 0
      ? `Você recebe R$ ${Math.abs(adj).toLocaleString("pt-BR")}`
      : "Sem grana na troca";
  if (tol > 0) return `${base} (±R$ ${tol.toLocaleString("pt-BR")})`;
  return base;
}

function cashSimplified(val: number): string {
  if (val === 0) return "troca direta";
  return val > 0
    ? `Recebe R$ ${val.toLocaleString("pt-BR")}`
    : `Paga R$ ${Math.abs(val).toLocaleString("pt-BR")}`;
}

export default function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [post, setPost] = useState<CarPost | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [postRes, authRes] = await Promise.all([
          fetch(`/api/posts/${id}`),
          fetch("/api/auth/me"),
        ]);
        if (!postRes.ok) {
          setError("Anúncio não encontrado");
          return;
        }
        const postData = await postRes.json();
        setPost(postData.post);

        if (authRes.ok) {
          const authData = await authRes.json();
          setUser(authData.user);
        }

        const matchRes = await fetch(`/api/posts/${id}/matches`);
        if (matchRes.ok) {
          const matchData = await matchRes.json();
          setMatches(matchData.matches || []);
        }
      } catch {
        setError("Erro ao carregar anúncio");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Excluir este anúncio?")) return;
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/my-posts");
        router.refresh();
      }
    } catch {
      setError("Erro ao excluir");
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Carregando...</div>;
  }

  if (error || !post) {
    return (
      <div className="text-center py-16 text-gray-500">
        {error || "Não encontrado"}
      </div>
    );
  }

  const isOwner = user?.id === post.userId;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Fotos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
        {post.images.length > 0 ? (
          post.images.map((img, i) => (
            <img
              key={i}
              src={`/uploads/${img}`}
              alt={`${post.title} foto ${i + 1}`}
              className="w-full h-52 object-cover rounded-lg"
            />
          ))
        ) : (
          <div className="w-full h-52 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 col-span-2">
            Sem fotos
          </div>
        )}
      </div>

      {/* Título + Descrição */}
      <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
      {post.description && (
        <p className="text-gray-600 mb-4">{post.description}</p>
      )}

      {/* Dados do carro */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <InfoBox label="Marca" value={post.car.brand} />
        <InfoBox label="Modelo" value={post.car.model} />
        <InfoBox label="Ano" value={String(post.car.year)} />
        <InfoBox
          label="Valor estimado"
          value={`R$ ${post.car.estimatedValue.toLocaleString("pt-BR")}`}
        />
      </div>

      {/* O que ele quer na troca */}
      <section className="border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-sm mb-3">Quer trocar por</h2>
        <div className="space-y-3">
          {(post.desiredTrade.vehicles || []).map((v: DesiredVehicle, i: number) => (
            <div key={i} className="bg-gray-50 rounded p-3 text-sm">
              <p className="font-medium">
                {v.vehicleType
                  ? v.vehicleType
                  : `${v.brand}${v.model ? ` ${v.model}` : ""}`
                }
                {v.transmission ? ` · ${v.transmission}` : ""}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                {v.yearMin || v.yearMax ? (
                  <span>Ano: {v.yearMin || "?"} – {v.yearMax || "?"}</span>
                ) : null}
                <span className="text-blue-600 font-medium">
                  {cashPill(v.cashAdjustment, v.cashAdjustmentTolerance)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contato */}
      <section className="border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-sm mb-2">Contato</h2>
        <div className="space-y-1 text-sm">
          {post.contactInfo.whatsapp && (
            <p>
              <span className="text-gray-500">WhatsApp:</span>{" "}
              <a
                href={`https://wa.me/${post.contactInfo.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {post.contactInfo.whatsapp}
              </a>
            </p>
          )}
          {post.contactInfo.email && (
            <p>
              <span className="text-gray-500">Email:</span>{" "}
              <a
                href={`mailto:${post.contactInfo.email}`}
                className="text-blue-600 hover:underline"
              >
                {post.contactInfo.email}
              </a>
            </p>
          )}
        </div>
      </section>

      {/* Dono pode editar / excluir */}
      {isOwner && (
        <div className="flex gap-3">
          <a
            href={`/posts/${post.id}/edit`}
            className="text-blue-600 border border-blue-300 px-4 py-2 rounded text-sm hover:bg-blue-50 transition-colors"
          >
            Editar anúncio
          </a>
          <button
            onClick={handleDelete}
            className="text-red-600 border border-red-300 px-4 py-2 rounded text-sm hover:bg-red-50 transition-colors"
          >
            Excluir anúncio
          </button>
        </div>
      )}

      {/* Matchs visíveis só pro dono */}
      {isOwner && matches.length > 0 && (
        <section className="border border-green-200 bg-green-50 rounded-lg p-4 mt-4">
          <h2 className="font-semibold text-green-700 mb-3">
            🎯 {matches.length} match{matches.length > 1 ? "s" : ""} encontrado
            {matches.length > 1 ? "s" : ""}!
          </h2>
          <div className="space-y-3">
            {matches.map((m) => (
              <div
                key={m.match.id}
                className="text-sm border-b border-green-100 pb-2 last:border-b-0"
              >
                <p className="font-medium">
                  {m.match.score}% compatível
                </p>
                <p className="text-blue-600 font-medium">
                  {m.match.suggestedCashFromA > 0
                    ? `Você recebe R$ ${Math.abs(m.match.suggestedCashFromA).toLocaleString("pt-BR")}`
                    : m.match.suggestedCashFromA < 0
                    ? `Você paga R$ ${Math.abs(m.match.suggestedCashFromA).toLocaleString("pt-BR")}`
                    : "Troca direta, sem grana"}
                </p>
                {m.otherPost && (
                  <a
                    href={`/posts/${m.otherPost.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    Ver: {m.otherPost.title} ({m.otherPost.car.brand}{" "}
                    {m.otherPost.car.model} {m.otherPost.car.year})
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-sm">{value}</p>
    </div>
  );
}
