"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useChat } from "@/lib/chat-context";

interface User {
  id: string;
  name: string;
  email: string;
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversationCount, setConversationCount] = useState(0);
  const { openWidget } = useChat();
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        // Also fetch conversation count
        const countRes = await fetch("/api/conversations/unread-count");
        if (countRes.ok) {
          const countData = await countRes.json();
          setConversationCount(countData.count || 0);
        }
      } else {
        setUser(null);
        setConversationCount(0);
      }
    } catch {
      setUser(null);
      setConversationCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser, pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-blue-600">
          CarMatch
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:text-blue-600 transition-colors">
            Ver carros
          </Link>
          {loading ? (
            <span className="text-gray-400">...</span>
          ) : user ? (
            <>
              <Link
                href="/posts/new"
                className="hover:text-blue-600 transition-colors"
              >
                Anunciar
              </Link>
              <Link
                href="/my-posts"
                className="hover:text-blue-600 transition-colors"
              >
                Meus anúncios
              </Link>
              <button
                onClick={openWidget}
                className="hover:text-blue-600 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                Conversas
                {conversationCount > 0 && (
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">
                    {conversationCount}
                  </span>
                )}
              </button>
              <span className="text-gray-500">{user.name}</span>
              <button
                onClick={handleLogout}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                Sair
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
