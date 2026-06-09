"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function PostForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const res = await fetch("/api/posts", { method: "POST", body: formData });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create post");
        return;
      }

      router.push("/my-posts");
      router.refresh();
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Car Details */}
      <fieldset className="border border-gray-200 rounded p-4 space-y-3">
        <legend className="font-semibold text-sm px-1">Your Car</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium mb-1">Brand *</label>
            <input
              name="brand"
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              placeholder="e.g. Honda"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium mb-1">Model *</label>
            <input
              name="model"
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              placeholder="e.g. Fit"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Year *</label>
            <input
              name="year"
              type="number"
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Estimated Value (R$) *
            </label>
            <input
              name="estimatedValue"
              type="number"
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </fieldset>

      {/* Desired Trade */}
      <fieldset className="border border-gray-200 rounded p-4 space-y-3">
        <legend className="font-semibold text-sm px-1">
          What You Want in Trade
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium mb-1">
              Desired Brand
            </label>
            <input
              name="desiredBrand"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              placeholder="Any brand if empty"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium mb-1">
              Desired Model
            </label>
            <input
              name="desiredModel"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              placeholder="Any model if empty"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Year Min</label>
            <input
              name="desiredYearMin"
              type="number"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Year Max</label>
            <input
              name="desiredYearMax"
              type="number"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-sm text-gray-500 mb-2">
            Cash adjustment: how much cash goes on top of the trade.
            <br />
            <strong>Positive</strong> = you pay that amount.{" "}
            <strong>Negative</strong> = you receive that amount.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Cash Adjustment (R$)
              </label>
              <input
                name="cashAdjustment"
                type="number"
                defaultValue={0}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Tolerance (±R$)
              </label>
              <input
                name="cashAdjustmentTolerance"
                type="number"
                defaultValue={0}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </fieldset>

      {/* Contact Info */}
      <fieldset className="border border-gray-200 rounded p-4 space-y-3">
        <legend className="font-semibold text-sm px-1">
          Contact Information
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              WhatsApp (with country code)
            </label>
            <input
              name="whatsapp"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              placeholder="+5511999999999"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              name="email"
              type="email"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </fieldset>

      {/* Images */}
      <fieldset className="border border-gray-200 rounded p-4 space-y-3">
        <legend className="font-semibold text-sm px-1">Photos</legend>
        <input
          name="images"
          type="file"
          multiple
          accept="image/*"
          className="text-sm"
        />
        <p className="text-xs text-gray-400">Upload one or more photos of your car</p>
      </fieldset>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Posting..." : "Post Car"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-gray-300 px-6 py-2 rounded hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
