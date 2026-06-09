"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PostCard from "@/components/PostCard";
import FilterBar from "@/components/FilterBar";
import type { CarPost } from "@/lib/types";

function HomeContent() {
  const [posts, setPosts] = useState<CarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const qs = searchParams.toString();
      const res = await fetch(`/api/posts${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      setPosts(data.posts || []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CarMatch</h1>
        <p className="text-gray-500 text-sm mt-1">
          Find the perfect trade for your car
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <FilterBar />
      </Suspense>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No cars posted yet.{" "}
          <a href="/posts/new" className="text-blue-600 underline">
            Be the first!
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
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-16 text-gray-400">Loading...</div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
