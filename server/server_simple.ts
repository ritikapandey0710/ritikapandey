import "dotenv/config";
import express from "express";

const app = express();
const port = process.env.PORT || 3008;

app.get("/", (_req, res) => {
  res.json({ message: "Help Desk API" });
});

app.get("/api/test", (_req, res) => {
  res.json({ message: "Test endpoint working" });
});

const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});