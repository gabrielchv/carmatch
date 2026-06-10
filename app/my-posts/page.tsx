"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CarPost, User, Match } from "@/lib/types";
import MatchCard from "@/components/MatchCard";

interface MatchResult {
  match: Match;
  otherPost: CarPost | null;
}

export default function MyPostsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<CarPost[]>([]);
  const [matchesMap, setMatchesMap] = useState<Record<string, MatchResult[]>>(
    {}
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const authRes = await fetch("/api/auth/me");
        if (!authRes.ok) {
          router.push("/auth");
          return;
        }
        const authData = await authRes.json();
        setUser(authData.user);

        const postsRes = await fetch("/api/posts");
        const postsData = await postsRes.json();
        const userPosts = (postsData.posts || []).filter(
          (p: CarPost) => p.userId === authData.user.id
        );
        setPosts(userPosts);

        const matchPromises = userPosts.map(async (post: CarPost) => {
          const res = await fetch(`/api/posts/${post.id}/matches`);
          if (res.ok) {
            const data = await res.json();
            return { postId: post.id, matches: data.matches || [] };
          }
          return { postId: post.id, matches: [] };
        });

        const matchResults = await Promise.all(matchPromises);
        const mm: Record<string, MatchResult[]> = {};
        matchResults.forEach(({ postId, matches }) => {
          mm[postId] = matches;
        });
        setMatchesMap(mm);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Carregando...</div>;
  }

  if (!user) return null;

  const totalMatches = Object.values(matchesMap).reduce(
    (acc, m) => acc + m.length,
    0
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Meus anúncios</h1>
      <p className="text-gray-500 text-sm mb-6">
        Olá, {user.name}!{" "}
        {totalMatches > 0 && (
          <span className="text-green-600 font-medium">
            · {totalMatches} match{totalMatches > 1 ? "s" : ""} encontrado
            {totalMatches > 1 ? "s" : ""}!
          </span>
        )}
      </p>

      {posts.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-300 rounded-lg">
          <p>Você ainda não anunciou nenhum carro.</p>
          <a
            href="/posts/new"
            className="text-blue-600 hover:underline text-sm mt-2 inline-block"
          >
            Anunciar meu carro →
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => {
            const postMatches = matchesMap[post.id] || [];
            return (
              <div
                key={post.id}
                className="border border-gray-200 rounded-lg bg-white overflow-hidden"
              >
                <a
                  href={`/posts/${post.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {post.images.length > 0 ? (
                      <img
                        src={`/uploads/${post.images[0]}`}
                        alt={post.title}
                        className="w-20 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-20 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                        Sem foto
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-sm">{post.title}</h2>
                      <p className="text-xs text-gray-500">
                        {post.car.brand} {post.car.model} {post.car.year}
                      </p>
                      <p className="text-xs text-gray-500">
                        R$ {post.car.estimatedValue.toLocaleString("pt-BR")}
                      </p>
                    </div>
                    {postMatches.length > 0 && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium shrink-0">
                        {postMatches.length} match
                        {postMatches.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </a>

                {postMatches.length > 0 && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                    <p className="text-xs font-medium text-gray-500">
                      Matchs encontrados:
                    </p>
                    {postMatches.map((m) => (
                      <MatchCard
                        key={m.match.id}
                        match={m.match}
                        otherPost={m.otherPost}
                        currentUserId={user.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
