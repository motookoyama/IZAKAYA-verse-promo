
import { useState, useCallback } from "react";
import type { Message } from "app/types.js";

type GatewayConfig = {
  API_KEY: string;
};

declare global {
  interface Window {
    __IZK_GATEWAY_CONFIG__?: GatewayConfig;
  }
}

const resolveApiKey = (): string => {
  if (typeof window !== "undefined") {
    const config = window.__IZK_GATEWAY_CONFIG__;
    if (config && typeof config.API_KEY === "string") {
      const value = config.API_KEY.trim();
      if (value) return value;
    }
  }
  const fallback = (import.meta as any).env?.VITE_GATEWAY_API_KEY;
  return typeof fallback === "string" ? fallback.trim() : "";
};

const buildHeaders = (apiKey: string) => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
};

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const apiKey = resolveApiKey();

  const sendMessage = useCallback(
    async (text: string, bffUrl: string) => {
      setLoading(true);

      const userMessage: Message = { id: self.crypto.randomUUID(), role: "user", text };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await fetch(`${bffUrl}/chat/v1`, {
          method: "POST",
          headers: buildHeaders(apiKey),
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => "Could not read error body.");
          throw new Error(`Request failed with status ${response.status}. ${errorBody}`);
        }

        const data = await response.json();
        const reply = typeof data.reply === "string" && data.reply.trim() ? data.reply.trim() : "[応答なし]";
        const aiMessage: Message = { id: self.crypto.randomUUID(), role: "model", text: reply };
        setMessages((prev) => [...prev, aiMessage]);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown network error occurred.";
        console.error(e);
        const errorResponseMessage: Message = {
          id: self.crypto.randomUUID(),
          role: "model",
          text: `⚠ エラー発生: ${errorMessage}`,
        };
        setMessages((prev) => [...prev, errorResponseMessage]);
      } finally {
        setLoading(false);
      }
    },
    [apiKey],
  );

  return { messages, loading, sendMessage };
};
