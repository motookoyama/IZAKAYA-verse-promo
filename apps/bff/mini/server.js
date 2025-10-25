import express from "express";

const app = express();

app.get("/", (_req, res) => {
  res.send("IZAKAYA Mini BFF is running");
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "IZAKAYA_BFF" });
});

app.get("/api/points", (_req, res) => {
  res.json({ status: "ok", points: 100 });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Mini BFF running on port ${PORT}`);
});
