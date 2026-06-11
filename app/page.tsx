"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PostCard from "@/components/PostCard";
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

  // Count active filters (for the mobile button badge)
  const filterCount = ["q", "minPrice", "maxPrice", "brand", "model", "yearMin", "yearMax", "mileageMin", "mileageMax", "localization", "desiredType"].filter(
    (key) => searchParams.get(key)
  ).length;

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

      {/* Mobile filter toggle */}
      <button
        onClick={() => setShowMobileFilters(true)}
        className="lg:hidden flex items-center gap-2 w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <svg
          className="w-4 h-4 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        <span className="flex-1 text-left">Filtros e ordenação</span>
        {filterCount > 0 && (
          <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
            {filterCount}
          </span>
        )}
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      <div className="flex gap-6">
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
        <div className="flex-1 min-w-0">
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
                <PostCard key={post.id} post={post} />
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
