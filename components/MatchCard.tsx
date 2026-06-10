import Link from "next/link";
import type { CarPost, Match } from "@/lib/types";

interface MatchCardProps {
  match: Match;
  otherPost: CarPost | null;
  currentUserId: string;
}

function cashSimplified(val: number): string {
  if (val === 0) return "troca direta, sem grana";
  return val > 0
    ? `Você recebe R$ ${val.toLocaleString("pt-BR")}`
    : `Você paga R$ ${Math.abs(val).toLocaleString("pt-BR")}`;
}

export default function MatchCard({
  match,
  otherPost,
  currentUserId,
}: MatchCardProps) {
  if (!otherPost) return null;

  // Determina direção do dinheiro relativa ao usuário logado
  const isPostA = match.postAId === otherPost.id;
  const cashRel = isPostA
    ? -match.suggestedCashFromA
    : match.suggestedCashFromA;

  return (
    <div className="border border-green-200 rounded-lg p-4 bg-green-50">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{otherPost.title}</p>
          <p className="text-xs text-gray-600">
            {otherPost.car.brand} {otherPost.car.model} {otherPost.car.year}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            R$ {otherPost.car.estimatedValue.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span
            className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${
              match.score >= 70
                ? "bg-green-200 text-green-800"
                : match.score >= 40
                ? "bg-yellow-200 text-yellow-800"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {match.score}% compatível
          </span>
        </div>
      </div>
      <p className="text-xs text-blue-600 font-medium mt-2">
        {cashSimplified(cashRel)}
      </p>
      <Link
        href={`/posts/${otherPost.id}`}
        className="text-xs text-blue-600 hover:underline inline-block mt-1"
      >
        Ver detalhes →
      </Link>
    </div>
  );
}
