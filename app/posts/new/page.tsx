"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PostForm from "@/components/PostForm";

export default function NewPostPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) router.push("/auth");
      })
      .finally(() => setChecking(false));
  }, [router]);

  if (checking) {
    return <div className="text-center py-16 text-gray-400">Checking...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Post Your Car</h1>
      <PostForm />
    </div>
  );
}
