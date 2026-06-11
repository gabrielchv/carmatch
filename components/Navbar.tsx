"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useChat } from "@/lib/chat-context";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversationCount, setConversationCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { openWidget } = useChat();
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
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

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setMobileMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  const handleOpenChat = () => {
    openWidget();
    setMobileMenuOpen(false);
  };

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between relative">
        <Link href="/" className="font-bold text-lg text-blue-600">
          CarMatch
        </Link>

        {/* Desktop nav links */}
        <div className="hidden lg:flex items-center gap-4 text-sm">
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
              <span className="text-gray-500 flex items-center gap-1.5">
                {user.avatar && (
                  <img
                    src={user.avatar}
                    alt=""
                    className="w-6 h-6 rounded-full"
                  />
                )}
                {user.name}
              </span>
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

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 -mr-2 text-gray-600 hover:text-gray-900 cursor-pointer"
          aria-label="Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-72 max-w-[80vw] bg-white shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100">
              <span className="font-semibold text-sm text-gray-700">Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex flex-col py-2">
              <MobileNavLink href="/" onClick={() => setMobileMenuOpen(false)}>
                Ver carros
              </MobileNavLink>

              {loading ? (
                <div className="px-5 py-3 text-sm text-gray-400">Carregando...</div>
              ) : user ? (
                <>
                  {user.avatar && (
                    <div className="px-5 py-3 flex items-center gap-2 text-sm text-gray-500 border-b border-gray-100">
                      <img
                        src={user.avatar}
                        alt=""
                        className="w-7 h-7 rounded-full"
                      />
                      {user.name}
                    </div>
                  )}
                  <MobileNavLink href="/posts/new" onClick={() => setMobileMenuOpen(false)}>
                    Anunciar
                  </MobileNavLink>
                  <MobileNavLink href="/my-posts" onClick={() => setMobileMenuOpen(false)}>
                    Meus anúncios
                  </MobileNavLink>
                  <button
                    onClick={handleOpenChat}
                    className="flex items-center justify-between w-full text-left px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <span>Conversas</span>
                    {conversationCount > 0 && (
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">
                        {conversationCount}
                      </span>
                    )}
                  </button>
                  <hr className="border-gray-100 my-1" />
                  <button
                    onClick={handleLogout}
                    className="text-left px-5 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <Link
                  href="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mx-4 mt-3 bg-blue-600 text-white text-sm text-center px-3 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  Entrar
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

function MobileNavLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
    >
      {children}
    </Link>
  );
}
