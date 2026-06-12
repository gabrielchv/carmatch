"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PostCard from "@/components/PostCard";
import FilterBar from "@/components/FilterBar";
import FilterSidebar from "@/components/FilterSidebar";
import type { CarPost } from "@/lib/types";

function HomeContent() {
  const [posts, setPosts] = useState<CarPost[]>([]);
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [myPostCount, setMyPostCount] = useState(0);
  const [myMatchCount, setMyMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const searchParams = useSearchParams();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = searchParams.toString();
      const [postsRes, authRes] = await Promise.all([
        fetch(`/api/posts${qs ? `?${qs}` : ""}`),
        fetch("/api/auth/me"),
      ]);
      const postsData = await postsRes.json();
      const allPosts: CarPost[] = postsData.posts || [];
      setPosts(allPosts);

      if (authRes.ok) {
        const authData = await authRes.json();
        const u = authData.user;
        setUser(u);

        // Conta posts do usuário
        const myPosts = allPosts.filter((p: CarPost) => p.userId === u.id);
        setMyPostCount(myPosts.length);

        // Conta matches pros posts do usuário
        let matchTotal = 0;
        await Promise.all(
          myPosts.map(async (p: CarPost) => {
            try {
              const r = await fetch(`/api/posts/${p.id}/matches`);
              if (r.ok) {
                const d = await r.json();
                matchTotal += (d.matches || []).length;
              }
            } catch {}
          })
        );
        setMyMatchCount(matchTotal);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CarMatch</h1>
          <p className="text-gray-500 text-sm mt-1">
            Troque seu carro com outras pessoas
          </p>
        </div>
        {user && (
          <div className="flex gap-3 text-sm">
            <Link
              href="/my-posts"
              className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded hover:bg-gray-200 transition-colors"
            >
              📋 {myPostCount} anúncio{myPostCount !== 1 ? "s" : ""}
            </Link>
            {myMatchCount > 0 && (
              <Link
                href="/my-posts"
                className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1.5 rounded hover:bg-green-200 transition-colors"
              >
                🎯 {myMatchCount} match{myMatchCount !== 1 ? "s" : ""}
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Search + Sort bar (always visible, outside filter) */}
      <Suspense fallback={<div className="h-11" />}>
        <FilterBar onToggleFilters={() => setShowMobileFilters(true)} />
      </Suspense>

      <div className="flex lg:gap-6">
        {/* Desktop sidebar */}
        <aside className="w-64 shrink-0 hidden lg:block">
          <FilterSidebar />
        </aside>

        {/* Mobile sidebar overlay */}
        <div className="lg:hidden">
          <FilterSidebar
            isOpen={showMobileFilters}
            onClose={() => setShowMobileFilters(false)}
          />
        </div>

        {/* Post grid */}
        <div className="flex-1 min-w-0 w-full">
          {loading ? (
            <div className="text-center py-16 text-gray-400">Carregando...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              Nenhum carro encontrado.{" "}
              <a href="/posts/new" className="text-blue-600 underline">
                Seja o primeiro a anunciar!
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} currentUser={user} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
