import "dotenv/config";
import cors from "cors";
import express from "express";
import { searchRouter } from "./routes/search.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const allowedOrigins = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "16kb" }));

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    tinyfishConfigured: Boolean(process.env.TINYFISH_API_KEY)
  });
});

app.use("/api", searchRouter);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled API error:", error);
  response.status(500).json({ error: "Something went wrong. Please try again." });
});

app.listen(port, () => {
  console.log(`ScholarAccess API listening on http://localhost:${port}`);
});
