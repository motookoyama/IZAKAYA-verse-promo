import express from "express";
import fetch from "node-fetch";

const app = express();
const PERSONA_ENGINE_URL = process.env.PERSONA_ENGINE_URL || "http://localhost:4105";

app.get("/", (_req, res) => {
  res.send("IZAKAYA Mini BFF is running");
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "IZAKAYA_BFF", persona_engine: PERSONA_ENGINE_URL });
});

app.get("/api/points", (_req, res) => {
  res.json({ status: "ok", points: 100 });
});

app.get("/api/personas", async (_req, res) => {
  try {
    const response = await fetch(`${PERSONA_ENGINE_URL}/api/personas`);
    if (!response.ok) {
      throw new Error(`persona-engine responded ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "Failed to reach persona-engine", detail: err.message });
  }
});

app.get("/api/personas/:id", async (req, res) => {
  try {
    const response = await fetch(`${PERSONA_ENGINE_URL}/api/personas/${req.params.id}`);
    if (!response.ok) {
      return res.status(response.status).json({ error: "Persona not found" });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "Failed to reach persona-engine", detail: err.message });
  }
});

app.get("/api/emotion", async (_req, res) => {
  try {
    const response = await fetch(`${PERSONA_ENGINE_URL}/api/emotion`);
    if (!response.ok) {
      throw new Error(`persona-engine responded ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "Failed to reach persona-engine", detail: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Mini BFF running on port ${PORT}`);
});
