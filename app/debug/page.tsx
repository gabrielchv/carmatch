"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DbState {
  users: { id: string; name: string; email: string }[];
  posts: { id: string; title: string; userId: string; car: { brand: string; model: string; year: number; estimatedValue: number }; createdAt: string }[];
  matches: { id: string; postAId: string; postBId: string; score: number; suggestedCashFromA: number }[];
}

export default function DebugPage() {
  const router = useRouter();
  const [authOk, setAuthOk] = useState(false);
  const [msg, setMsg] = useState("");
  const [dbState, setDbState] = useState<DbState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchState = useCallback(async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      if (!authRes.ok) {
        router.push("/auth");
        return;
      }
      setAuthOk(true);

      // Fetch all data
      const [usersRes, postsRes, matchesRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/posts"),
        fetch("/api/posts"), // We need dedicated debug endpoints, but for v0 it's OK
      ]);

      // Fetch all users (from the users file directly needed)
      // For simplicity, we fetch from the login endpoint just to get the info...

      // Actually let's fetch from debug endpoints - we'll build this differently
      // For now, try to inspect via the regular API
      const postsData = await postsRes.json();
      const allPosts = postsData.posts || [];

      // Fetch users from the DB directly through a simple approach
      // Since we don't have a users list API, let's use the seed data info
      setDbState({
        users: [],
        posts: allPosts.map((p: any) => ({
          id: p.id,
          title: p.title,
          userId: p.userId,
          car: p.car,
          createdAt: p.createdAt,
        })),
        matches: [],
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const doAction = async (url: string, label: string) => {
    setMsg(`${label}...`);
    try {
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      setMsg(`${label} done: ${JSON.stringify(data)}`);
      await fetchState();
    } catch {
      setMsg(`${label} failed`);
    }
  };

  const refresh = async () => {
    setLoading(true);
    await fetchState();
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Loading...</div>;
  }

  if (!authOk) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Debug / Testing Dashboard</h1>
        <button
          onClick={refresh}
          className="text-sm text-blue-600 hover:underline"
        >
          Refresh
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => doAction("/api/debug/seed", "Seeding data")}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition-colors"
        >
          🌱 Seed Mock Data
        </button>
        <button
          onClick={() => doAction("/api/matches/trigger", "Triggering matching")}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
        >
          🔄 Trigger Matching
        </button>
        <button
          onClick={() => doAction("/api/debug/clear", "Clearing data")}
          className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors"
        >
          🗑️ Clear All Data
        </button>
      </div>

      {msg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded p-3">
          {msg}
        </div>
      )}

      {/* Database State */}
      {dbState && (
        <div className="space-y-6">
          {/* Users table */}
          <section>
            <h2 className="font-semibold mb-2">
              Posts ({dbState.posts.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2 border">ID</th>
                    <th className="text-left p-2 border">Title</th>
                    <th className="text-left p-2 border">Car</th>
                    <th className="text-right p-2 border">Value</th>
                    <th className="text-left p-2 border">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {dbState.posts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="p-2 border font-mono">
                        {p.id.slice(0, 8)}...
                      </td>
                      <td className="p-2 border">{p.title}</td>
                      <td className="p-2 border">
                        {p.car.brand} {p.car.model} {p.car.year}
                      </td>
                      <td className="p-2 border text-right">
                        R$ {p.car.estimatedValue.toLocaleString("pt-BR")}
                      </td>
                      <td className="p-2 border text-xs">
                        {new Date(p.createdAt).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                  {dbState.posts.length === 0 && (
                    <tr>
                      <td
                        className="p-4 text-center text-gray-400 border"
                        colSpan={5}
                      >
                        No posts — click "Seed Mock Data" above
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Matches table */}
          <section>
            <h2 className="font-semibold mb-2">
              Matches ({dbState.matches.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2 border">Post A</th>
                    <th className="text-left p-2 border">Post B</th>
                    <th className="text-center p-2 border">Score</th>
                    <th className="text-right p-2 border">Cash (A→B)</th>
                  </tr>
                </thead>
                <tbody>
                  {dbState.matches.map((m) => {
                    const postA = dbState.posts.find(
                      (p) => p.id === m.postAId
                    );
                    const postB = dbState.posts.find(
                      (p) => p.id === m.postBId
                    );
                    return (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="p-2 border">
                          {postA?.title || m.postAId.slice(0, 8)}
                        </td>
                        <td className="p-2 border">
                          {postB?.title || m.postBId.slice(0, 8)}
                        </td>
                        <td className="p-2 border text-center font-bold">
                          {m.score}/100
                        </td>
                        <td className="p-2 border text-right">
                          R$ {m.suggestedCashFromA.toLocaleString("pt-BR")}
                        </td>
                      </tr>
                    );
                  })}
                  {dbState.matches.length === 0 && (
                    <tr>
                      <td
                        className="p-4 text-center text-gray-400 border"
                        colSpan={4}
                      >
                        No matches found yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
