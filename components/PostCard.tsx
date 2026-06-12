"use client";

import Link from "next/link";
import { useChat } from "@/lib/chat-context";
import type { CarPost } from "@/lib/types";

function cashLabelShort(adj: number): string {
  if (adj === 0) return "troca direta";
  return adj > 0
    ? `+ R$ ${adj.toLocaleString("pt-BR")}`
    : `- R$ ${Math.abs(adj).toLocaleString("pt-BR")}`;
}

export default function PostCard({
  post,
  currentUser,
}: {
  post: CarPost;
  currentUser?: { id: string } | null;
}) {
  const firstVehicle = post.desiredTrade.vehicles?.[0];
  const { startConversation } = useChat();

  const canChat = currentUser && currentUser.id !== post.userId;

  const handleChat = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await startConversation(post.id);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow relative group">
      <Link href={`/posts/${post.id}`} className="block">
        {post.images.length > 0 ? (
          <img
            src={`/uploads/${post.images[0]}`}
            alt={post.title}
            className="w-full h-40 object-cover"
          />
        ) : (
          <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
            Sem foto
          </div>
        )}
        <div className="p-3 space-y-1">
          <h2 className="font-semibold text-sm truncate">{post.title}</h2>
          <p className="text-xs text-gray-500">
            {post.car.brand} {post.car.model} {post.car.year}
          </p>
          <p className="text-xs text-gray-500">
            R$ {post.car.estimatedValue.toLocaleString("pt-BR")}
          </p>
          {/* Informações adicionais */}
          <div className="flex gap-2 flex-wrap text-[11px] text-gray-400">
            {post.car.mileage !== undefined && (
              <span>🚗 {post.car.mileage.toLocaleString()} km</span>
            )}
            {post.car.color && <span>🎨 {post.car.color}</span>}
            {post.car.localization && <span>📍 {post.car.localization}</span>}
          </div>
          {firstVehicle && (
            <p className="text-xs text-blue-600 font-medium">
              Quer {firstVehicle.vehicleType
                ? firstVehicle.vehicleType
                : `${firstVehicle.brand}${firstVehicle.model ? ` ${firstVehicle.model}` : ""}`
              }
              {" · "}
              {cashLabelShort(firstVehicle.cashAdjustment)}
            </p>
          )}
          {post.desiredTrade.vehicles && post.desiredTrade.vehicles.length > 1 && (
            <p className="text-[10px] text-gray-400">
              +{post.desiredTrade.vehicles.length - 1} opção(ões)
            </p>
          )}
        </div>
      </Link>

      {/* Chat button — appears when logged in and not your own post */}
      {canChat && (
        <button
          onClick={handleChat}
          className="absolute top-2 right-2 w-9 h-9 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 transition-all flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="Conversar sobre este carro"
          title="Conversar"
        >
          💬
        </button>
      )}
    </div>
  );
}
