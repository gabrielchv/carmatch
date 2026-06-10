import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ChatProvider } from "@/lib/chat-context";
import ChatWidget from "@/components/ChatWidget";

export const metadata: Metadata = {
  title: "CarMatch - Troque seu carro",
  description: "Plataforma de troca de carros — encontre o match perfeito pro seu veículo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <ChatProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <ChatWidget />
        </ChatProvider>
      </body>
    </html>
  );
}
