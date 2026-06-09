"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CarPost, User } from "@/lib/types";

interface MatchResult {
  match: {
    id: string;
    score: number;
    suggestedCashFromA: number;
    status: string;
  };
  otherPost: CarPost | null;
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
          setError("Post not found");
          return;
        }
        const postData = await postRes.json();
        setPost(postData.post);

        if (authRes.ok) {
          const authData = await authRes.json();
          setUser(authData.user);
        }

        // Fetch matches
        const matchRes = await fetch(`/api/posts/${id}/matches`);
        if (matchRes.ok) {
          const matchData = await matchRes.json();
          setMatches(matchData.matches || []);
        }
      } catch {
        setError("Failed to load post");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this post?")) return;
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/my-posts");
        router.refresh();
      }
    } catch {
      setError("Failed to delete");
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Loading...</div>;
  }

  if (error || !post) {
    return (
      <div className="text-center py-16 text-gray-500">
        {error || "Post not found"}
      </div>
    );
  }

  const isOwner = user?.id === post.userId;
  const cashLabel =
    post.desiredTrade.cashAdjustment === 0
      ? "Direct trade (no cash)"
      : post.desiredTrade.cashAdjustment > 0
      ? `You pay R$ ${post.desiredTrade.cashAdjustment.toLocaleString("pt-BR")}`
      : `You receive R$ ${Math.abs(post.desiredTrade.cashAdjustment).toLocaleString("pt-BR")}`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Image Gallery */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
        {post.images.length > 0 ? (
          post.images.map((img, i) => (
            <img
              key={i}
              src={`/uploads/${img}`}
              alt={`${post.title} photo ${i + 1}`}
              className="w-full h-52 object-cover rounded-lg"
            />
          ))
        ) : (
          <div className="w-full h-52 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 col-span-2">
            No photos
          </div>
        )}
      </div>

      {/* Title & Description */}
      <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
      {post.description && (
        <p className="text-gray-600 mb-4">{post.description}</p>
      )}

      {/* Car Details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <DetailBox label="Brand" value={post.car.brand} />
        <DetailBox label="Model" value={post.car.model} />
        <DetailBox label="Year" value={String(post.car.year)} />
        <DetailBox
          label="Estimated Value"
          value={`R$ ${post.car.estimatedValue.toLocaleString("pt-BR")}`}
        />
      </div>

      {/* Desired Trade */}
      <section className="border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-sm mb-2">Looking for</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Brand:</span>{" "}
            {post.desiredTrade.brand || "Any"}
          </div>
          <div>
            <span className="text-gray-500">Model:</span>{" "}
            {post.desiredTrade.model || "Any"}
          </div>
          <div>
            <span className="text-gray-500">Year:</span>{" "}
            {post.desiredTrade.yearMin || "Any"} -{" "}
            {post.desiredTrade.yearMax || "Any"}
          </div>
          <div>
            <span className="text-blue-600 font-medium">{cashLabel}</span>
            {post.desiredTrade.cashAdjustmentTolerance > 0 && (
              <span className="text-gray-400 text-xs block">
                ±R$ {post.desiredTrade.cashAdjustmentTolerance.toLocaleString("pt-BR")} tolerance
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-sm mb-2">Contact</h2>
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

      {/* Matches (shown to non-owners if there's a match) */}
      {!isOwner && matches.length > 0 && (
        <section className="border border-green-200 bg-green-50 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-green-700 mb-2">
            🎯 Match Found!
          </h2>
          {matches.map((m) => (
            <div key={m.match.id} className="text-sm space-y-1">
              <p>
                <strong>Score:</strong> {m.match.score}/100
              </p>
              {m.match.suggestedCashFromA !== 0 && (
                <p>
                  <strong>Suggested cash adjustment:</strong>{" "}
                  {m.match.suggestedCashFromA > 0
                    ? `You pay R$ ${Math.abs(m.match.suggestedCashFromA).toLocaleString("pt-BR")}`
                    : `You receive R$ ${Math.abs(m.match.suggestedCashFromA).toLocaleString("pt-BR")}`}
                </p>
              )}
              {m.otherPost && (
                <a
                  href={`/posts/${m.otherPost.id}`}
                  className="text-blue-600 hover:underline inline-block mt-1"
                >
                  View matched post: {m.otherPost.title}
                </a>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Owner actions */}
      {isOwner && (
        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            className="text-red-600 border border-red-300 px-4 py-2 rounded text-sm hover:bg-red-50 transition-colors"
          >
            Delete Post
          </button>
        </div>
      )}

      {matches.length > 0 && isOwner && (
        <section className="border border-green-200 bg-green-50 rounded-lg p-4 mt-4">
          <h2 className="font-semibold text-green-700 mb-2">
            🎯 {matches.length} Match{matches.length > 1 ? "es" : ""} Found
          </h2>
          <div className="space-y-3">
            {matches.map((m) => (
              <div key={m.match.id} className="text-sm border-b border-green-100 pb-2 last:border-0">
                <p>
                  <strong>Score:</strong> {m.match.score}/100
                </p>
                <p>
                  <strong>Cash:</strong>{" "}
                  {m.match.suggestedCashFromA > 0
                    ? `They pay R$ ${Math.abs(m.match.suggestedCashFromA).toLocaleString("pt-BR")}`
                    : m.match.suggestedCashFromA < 0
                    ? `You pay R$ ${Math.abs(m.match.suggestedCashFromA).toLocaleString("pt-BR")}`
                    : "No cash adjustment"}
                </p>
                {m.otherPost && (
                  <a
                    href={`/posts/${m.otherPost.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    View: {m.otherPost.title} ({m.otherPost.car.brand}{" "}
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

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-sm">{value}</p>
    </div>
  );
}
