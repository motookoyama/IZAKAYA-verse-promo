import dotenv from "dotenv";
dotenv.config();

import axios from "axios";

const PROVIDER = (process.env.PROVIDER || "").toLowerCase();

const KNOWN_PROVIDERS = new Set(["openai", "gemini", "ollama"]);

function assertProvider() {
  if (!PROVIDER) {
    throw new Error("PROVIDER is not set");
  }
  if (!KNOWN_PROVIDERS.has(PROVIDER)) {
    throw new Error(`Unknown provider: ${PROVIDER}`);
  }
  return PROVIDER;
}

function getBaseConfig() {
  const provider = assertProvider();

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL;
    const endpoint = process.env.OPENAI_ENDPOINT;
    if (!apiKey || !model || !endpoint) {
      throw new Error("OPENAI_API_KEY, OPENAI_MODEL, OPENAI_ENDPOINT are required");
    }
    return { provider, apiKey, model, endpoint };
  }

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL;
    const endpoint = process.env.GEMINI_ENDPOINT;
    if (!apiKey || !model || !endpoint) {
      throw new Error("GEMINI_API_KEY, GEMINI_MODEL, GEMINI_ENDPOINT are required");
    }
    return { provider, apiKey, model, endpoint };
  }

  const model = process.env.OLLAMA_MODEL;
  const host = process.env.OLLAMA_HOST || "http://localhost:11434";
  if (!model) {
    throw new Error("OLLAMA_MODEL is required");
  }
  return { provider, model, endpoint: host };
}

export function getProviderTelemetry() {
  const { provider, model, endpoint } = getBaseConfig();
  return { provider, model, endpoint };
}

export async function callLLM(message) {
  if (typeof message !== "string" || !message.trim()) {
    throw new Error("callLLM requires a non-empty message string");
  }

  const { provider, model, endpoint, apiKey } = getBaseConfig();
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

  // provider === "ollama"
  const url = `${endpoint.replace(/\/$/, "")}/api/generate`;
  const response = await axios.post(url, {
    model,
    prompt,
  });
  const reply = response.data?.response;
  if (!reply) {
    throw new Error("Ollama response did not include response field");
  }
  return { provider, model, endpoint: url, reply };
}
