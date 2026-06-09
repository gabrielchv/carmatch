import Link from "next/link";
import type { CarPost } from "@/lib/types";

export default function PostCard({ post }: { post: CarPost }) {
  const cashLabel =
    post.desiredTrade.cashAdjustment === 0
      ? "Direct trade (no cash)"
      : post.desiredTrade.cashAdjustment > 0
      ? `You pay +R$ ${post.desiredTrade.cashAdjustment.toLocaleString("pt-BR")}`
      : `You receive R$ ${Math.abs(post.desiredTrade.cashAdjustment).toLocaleString("pt-BR")}`;

  return (
    <Link
      href={`/posts/${post.id}`}
      className="block border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow"
    >
      {post.images.length > 0 ? (
        <img
          src={`/uploads/${post.images[0]}`}
          alt={post.title}
          className="w-full h-40 object-cover"
        />
      ) : (
        <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
          No photo
        </div>
      )}
      <div className="p-3 space-y-1.5">
        <h2 className="font-semibold text-sm truncate">{post.title}</h2>
        <p className="text-xs text-gray-500">
          {post.car.brand} {post.car.model} {post.car.year}
        </p>
        <p className="text-xs text-gray-500">
          R$ {post.car.estimatedValue.toLocaleString("pt-BR")}
        </p>
        <p className="text-xs text-blue-600 font-medium">{cashLabel}</p>
        {post.desiredTrade.brand && (
          <p className="text-xs text-gray-400">
            Want: {post.desiredTrade.brand}
            {post.desiredTrade.model ? ` ${post.desiredTrade.model}` : ""}
          </p>
        )}
      </div>
    </Link>
  );
}
