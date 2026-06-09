import Link from "next/link";
import type { CarPost, Match } from "@/lib/types";

interface MatchCardProps {
  match: Match;
  otherPost: CarPost | null;
  currentUserId: string;
}

export default function MatchCard({
  match,
  otherPost,
  currentUserId,
}: MatchCardProps) {
  if (!otherPost) return null;

  // Determine cash direction relative to current user
  // If current user owns postA, cash is from A
  // If current user owns postB, cash is from B (negate)
  const isPostA = match.postAId === otherPost.id;
  const cashRelative = isPostA
    ? -match.suggestedCashFromA // other post is A, so cash direction is reversed
    : match.suggestedCashFromA; // other post is B

  const cashLabel =
    cashRelative === 0
      ? "No cash adjustment"
      : cashRelative > 0
      ? `You receive R$ ${cashRelative.toLocaleString("pt-BR")}`
      : `You pay R$ ${Math.abs(cashRelative).toLocaleString("pt-BR")}`;

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
            {match.score}/100
          </span>
        </div>
      </div>
      <p className="text-xs text-blue-600 mt-2">{cashLabel}</p>
      <Link
        href={`/posts/${otherPost.id}`}
        className="text-xs text-blue-600 hover:underline inline-block mt-1"
      >
        View details →
      </Link>
    </div>
  );
}
