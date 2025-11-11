import dotenv from "dotenv";
dotenv.config();

import axios from "axios";

const KNOWN_PROVIDERS = new Set(["openai", "gemini", "ollama", "custom"]);

function normalizeProvider(provider) {
  return (provider || process.env.PROVIDER || "").trim().toLowerCase();
}

function resolveConfig(overrides = {}) {
  const provider = normalizeProvider(overrides.provider);
  if (!provider) {
    throw new Error("provider is not configured");
  }
  if (!KNOWN_PROVIDERS.has(provider)) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const baseConfig = {
    provider,
    model: overrides.model || "",
    apiKey: overrides.apiKey || "",
    endpoint: overrides.endpoint || "",
  };

  if (provider === "openai") {
    baseConfig.model ||= process.env.OPENAI_MODEL || "";
    baseConfig.apiKey ||= process.env.OPENAI_API_KEY || "";
    baseConfig.endpoint ||= process.env.OPENAI_ENDPOINT || "https://api.openai.com/v1/chat/completions";
    if (!baseConfig.apiKey || !baseConfig.model || !baseConfig.endpoint) {
      throw new Error("OPENAI configuration incomplete (apiKey/model/endpoint required)");
    }
  } else if (provider === "gemini") {
    baseConfig.model ||= process.env.GEMINI_MODEL || "";
    baseConfig.apiKey ||= process.env.GEMINI_API_KEY || "";
    baseConfig.endpoint ||= process.env.GEMINI_ENDPOINT || "https://generativelanguage.googleapis.com/v1beta";
    if (!baseConfig.apiKey || !baseConfig.model || !baseConfig.endpoint) {
      throw new Error("GEMINI configuration incomplete (apiKey/model/endpoint required)");
    }
  } else if (provider === "ollama") {
    baseConfig.model ||= process.env.OLLAMA_MODEL || "";
    baseConfig.endpoint ||= process.env.OLLAMA_ENDPOINT || process.env.OLLAMA_HOST || "http://localhost:11434";
    if (!baseConfig.model || !baseConfig.endpoint) {
      throw new Error("OLLAMA configuration incomplete (model/endpoint required)");
    }
  } else if (provider === "custom") {
    baseConfig.model ||= process.env.CUSTOM_MODEL || "";
    baseConfig.endpoint ||= process.env.CUSTOM_ENDPOINT || "";
    baseConfig.apiKey ||= process.env.CUSTOM_API_KEY || "";
    if (!baseConfig.endpoint) {
      throw new Error("CUSTOM configuration incomplete (endpoint required)");
    }
  }

  return baseConfig;
}

export function getProviderTelemetry(overrides) {
  const { provider, model, endpoint } = resolveConfig(overrides);
  return { provider, model, endpoint };
}

export async function callLLM(message, overrides) {
  if (typeof message !== "string" || !message.trim()) {
    throw new Error("callLLM requires a non-empty message string");
  }

  const { provider, model, endpoint, apiKey } = resolveConfig(overrides);
  const prompt = message.trim();

  if (provider === "openai") {
    const response = await axios.post(
      endpoint,
      {
        model,
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );
    const choice = response.data?.choices?.[0]?.message?.content;
    if (!choice) {
      throw new Error("OpenAI response did not include choices[0].message.content");
    }
    return { provider, model, endpoint, reply: choice };
  }

  if (provider === "gemini") {
    const url = `${endpoint.replace(/\/$/, "")}/${model}:generateContent`;
    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
      },
    );
    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      throw new Error("Gemini response did not include candidates[0].content.parts[0].text");
    }
    return { provider, model, endpoint: url, reply };
  }

  // provider === "ollama" or "custom"
  const target = endpoint.replace(/\/$/, "");
  const url = provider === "ollama" ? `${target}/api/generate` : target;
  const payload =
    provider === "ollama"
      ? { model, prompt }
      : { model, prompt };
  const headers = { "Content-Type": "application/json" };
  if (provider === "custom" && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await axios.post(url, payload, { headers });
  const reply =
    provider === "ollama" ? response.data?.response : response.data?.reply ?? response.data?.text ?? null;
  if (!reply) {
    throw new Error("LLM response did not include reply text");
  }
  return { provider, model, endpoint: url, reply };
}
