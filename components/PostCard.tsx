import Link from "next/link";
import type { CarPost } from "@/lib/types";

function cashLabelShort(adj: number): string {
  if (adj === 0) return "troca direta";
  return adj > 0
    ? `+ R$ ${adj.toLocaleString("pt-BR")}`
    : `- R$ ${Math.abs(adj).toLocaleString("pt-BR")}`;
}

export default function PostCard({ post }: { post: CarPost }) {
  const firstVehicle = post.desiredTrade.vehicles?.[0];

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
        {firstVehicle && (
          <p className="text-xs text-blue-600 font-medium">
            Quer {firstVehicle.brand}
            {firstVehicle.model ? ` ${firstVehicle.model}` : ""}
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
  );
}
